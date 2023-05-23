import React, {useCallback, useEffect} from 'react';

import {BottomSheet} from '@app/components/bottom-sheet';
import {Spacer} from '@app/components/ui';
import {WalletRow} from '@app/components/wallet-row';
import {useApp} from '@app/hooks';
import {Modals} from '@app/types';

export function WalletsBottomSheet({
  closeDistance,
  wallets,
  title,
  autoSelectWallet = true,
  eventSuffix = '',
  onClose,
}: Modals['walletsBottomSheet']) {
  const app = useApp();

  const onPressWallet = useCallback(
    (address: string) => {
      onClose?.();
      app.emit(`wallet-selected${eventSuffix}`, address);
    },
    [app, eventSuffix, onClose],
  );
  const onCloseSheet = () => {
    app.emit(`wallet-selected-reject${eventSuffix}`);
    onClose?.();
  };

  useEffect(() => {
    if (autoSelectWallet && wallets.length === 1) {
      onPressWallet(wallets[0].address);
      onClose?.();
    }

    return () => {
      app.emit(`wallet-selected-reject${eventSuffix}`);
    };
  }, [wallets, onPressWallet, app, eventSuffix, autoSelectWallet, onClose]);

  return (
    <BottomSheet
      onClose={onCloseSheet}
      closeDistance={closeDistance}
      i18nTitle={title}>
      {wallets.map((item, id) => (
        <WalletRow key={id} item={item} onPress={onPressWallet} />
      ))}
      <Spacer height={50} />
    </BottomSheet>
  );
}
