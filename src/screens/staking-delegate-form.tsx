import React, {useCallback, useMemo, useState} from 'react';

import {StakingDelegateForm} from '@app/components/staking-delegate-form';
import {app} from '@app/contexts';
import {getProviderInstanceForWallet} from '@app/helpers';
import {useTypedNavigation, useTypedRoute, useWallet} from '@app/hooks';
import {useEffectAsync} from '@app/hooks/use-effect-async';
import {useWalletsBalance} from '@app/hooks/use-wallets-balance';
import {Balance} from '@app/services/balance';
import {Cosmos} from '@app/services/cosmos';

export const StakingDelegateFormScreen = () => {
  const navigation = useTypedNavigation();
  const {account, validator} = useTypedRoute<'stakingDelegateForm'>().params;
  const wallet = useWallet(account);
  const balances = useWalletsBalance([wallet!]);
  const currentBalance = useMemo(() => balances[account], [balances, account]);
  const [fee, setFee] = useState(new Balance(Cosmos.fee.amount));

  useEffectAsync(async () => {
    const instance = await getProviderInstanceForWallet(wallet!);
    const cosmos = new Cosmos(app.provider);
    const f = await cosmos.simulateDelegate(
      instance,
      wallet?.path!,
      validator.operator_address,
      currentBalance.availableForStake,
    );
    Logger.log('f.amount', f.amount);
    setFee(new Balance(f.amount));
  }, [wallet, validator, currentBalance]);

  const onAmount = useCallback(
    (amount: number) => {
      navigation.navigate('stakingDelegatePreview', {
        validator,
        account,
        amount: amount,
        fee: fee,
      });
    },
    [fee, navigation, account, validator],
  );

  return (
    <StakingDelegateForm
      validator={validator}
      account={account}
      onAmount={onAmount}
      balance={currentBalance.availableForStake}
      fee={fee}
    />
  );
};
