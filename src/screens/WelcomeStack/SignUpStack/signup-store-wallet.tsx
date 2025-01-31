import {useCallback, useEffect} from 'react';

import {
  ProviderSSSBase,
  ProviderSSSEvm,
  ProviderSSSTron,
} from '@haqq/rn-wallet-providers';
import {observer} from 'mobx-react';

import {hideModal, showModal} from '@app/helpers';
import {AddressUtils} from '@app/helpers/address-utils';
import {
  getProviderForNewWallet,
  getTronProviderForNewWallet,
} from '@app/helpers/get-provider-for-new-wallet';
import {useTypedNavigation, useTypedRoute} from '@app/hooks';
import {useError} from '@app/hooks/use-error';
import {I18N, getText} from '@app/i18n';
import {AppStore} from '@app/models/app';
import {Wallet} from '@app/models/wallet';
import {
  HomeStackRoutes,
  SignUpStackParamList,
  SignUpStackRoutes,
  WelcomeStackRoutes,
} from '@app/route-types';
import {SssProviders} from '@app/services/provider-sss';
import {AddressTron, ModalType, WalletType} from '@app/types';
import {
  ETH_COIN_TYPE,
  ETH_HD_SHORT_PATH,
  TRON_COIN_TYPE,
} from '@app/variables/common';

export const SignUpStoreWalletScreen = observer(() => {
  const navigation = useTypedNavigation<SignUpStackParamList>();
  const showError = useError();
  const route = useTypedRoute<
    SignUpStackParamList,
    SignUpStackRoutes.SignupStoreWallet
  >();

  const goBack = useCallback(() => {
    hideModal(ModalType.loading);
    if (AppStore.isOnboarded) {
      // @ts-ignore
      navigation.replace(HomeStackRoutes.SignUp);
    } else {
      navigation.replace(WelcomeStackRoutes.SignUp);
    }
  }, [navigation]);

  useEffect(() => {
    showModal(ModalType.loading, {
      text: getText(I18N.signupStoreWalletCreatingAccount),
    });
  }, []);

  const getCurrentProvider = useCallback(async () => {
    //@ts-ignore
    const {provider} = route.params;
    if (!provider || typeof provider === 'string') {
      return await getProviderForNewWallet(route.params);
    }
    return provider;
  }, [route.params]);

  const getWalletType = useCallback(() => {
    if (
      //@ts-ignore
      route.params.sssPrivateKey ||
      //@ts-ignore
      route.params.provider instanceof ProviderSSSBase ||
      //@ts-ignore
      route.params.provider instanceof ProviderSSSEvm ||
      //@ts-ignore
      route.params.provider instanceof ProviderSSSTron ||
      //@ts-ignore
      Object.values(SssProviders).includes(route.params.provider)
    ) {
      return WalletType.sss;
    }

    return WalletType.mnemonic;
  }, [route.params]);

  const getWalletIndex = (nextIndex: number) => {
    if (Wallet.getSize() > 0 && isNaN(nextIndex)) {
      return 1;
    }
    if (!nextIndex) {
      return 0;
    }
    return nextIndex;
  };

  useEffect(() => {
    setTimeout(async () => {
      try {
        const provider = await getCurrentProvider();

        if (route.params.type === 'sss' && !provider) {
          Logger.captureException(
            new Error('sssLimitReached: provider not found'),
            'createStoreWallet',
          );
          showModal(ModalType.sssLimitReached);
          return goBack();
        }

        const tronProvider = await getTronProviderForNewWallet(
          getWalletType(),
          provider.getIdentifier(),
        );

        // sssLimitReached
        if (!provider || typeof provider?.getIdentifier !== 'function') {
          hideModal('loading');
          goBack();
          return;
        }

        const accountWallets = Wallet.getForAccount(provider.getIdentifier());
        const nextHdPathIndex = accountWallets.reduce((memo, wallet) => {
          const segments = wallet.getPath(provider)?.split('/') ?? ['0'];
          return Math.max(
            memo,
            parseInt(segments[segments.length - 1], 10) + 1,
          );
        }, 0);

        const walletIndex = getWalletIndex(nextHdPathIndex);
        const walletsTotalCount = Wallet.getSize();

        const hdPath = `${ETH_HD_SHORT_PATH}/${walletIndex}`;
        const total = Wallet.getAll().length;
        const name =
          walletsTotalCount === 0
            ? getText(I18N.mainAccount)
            : getText(I18N.signupStoreWalletAccountNumber, {
                number: `${total + 1}`,
              });

        try {
          const {address} = await provider.getAccountInfo(hdPath);
          const {address: tronAddress} = await tronProvider.getAccountInfo(
            hdPath.replace?.(ETH_COIN_TYPE, TRON_COIN_TYPE)!,
          );
          const type = getWalletType();

          await Wallet.create(name, {
            address: AddressUtils.toEth(address),
            tronAddress: tronAddress as AddressTron,
            accountId: provider.getIdentifier(),
            path: hdPath.replace?.(ETH_COIN_TYPE, TRON_COIN_TYPE)!,
            type,
            socialLinkEnabled: type === WalletType.sss,
            mnemonicSaved: !!accountWallets.find(
              wallet => !!wallet.mnemonicSaved,
            ),
          });
        } catch (err) {
          Logger.captureException(err, 'createStoreWallet');
          if (getWalletType() === WalletType.sss) {
            hideModal('loading');
            showModal(ModalType.errorCreateAccount);
            // @ts-ignore
            showError('createStoreWallet', err.message);
            goBack();
            return;
          } else {
            throw err;
          }
        }

        //@ts-ignore
        navigation.navigate(route.params.nextScreen ?? 'onboardingFinish');
      } catch (error) {
        switch (error) {
          case 'wallet_already_exists':
            showModal(ModalType.errorAccountAdded);
            goBack();
            break;
          default:
            if (error instanceof Error) {
              Logger.captureException(error, 'createStoreWallet');
              showModal(ModalType.errorCreateAccount);
              goBack();
            }
        }
      }
    }, 350);
  }, [goBack, navigation, route.params]);

  return null;
});
