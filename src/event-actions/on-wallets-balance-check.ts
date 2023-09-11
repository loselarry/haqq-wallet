import {app} from '@app/contexts';
import {VariablesDate} from '@app/models/variables-date';
import {Wallet} from '@app/models/wallet';
import {EthNetwork} from '@app/services';
import {Balance} from '@app/services/balance';
import {Cosmos} from '@app/services/cosmos';
import {Indexer} from '@app/services/indexer';

export async function onWalletsBalanceCheck() {
  try {
    let balances: [string, Balance][] = [];

    let lastBalanceUpdates = VariablesDate.get(
      `indexer_${app.provider.cosmosChainId}`,
    );

    const wallets = Wallet.getAll();
    try {
      if (!app.provider.indexer) {
        throw new Error('Indexer is not available');
      }

      let accounts = wallets.map(w => Cosmos.addressToBech32(w.address));
      const updates = await Indexer.instance.updates(
        accounts,
        lastBalanceUpdates,
      );

      balances = Object.entries(updates.balance).map(b => {
        Logger.log('🟣 getBalance', Cosmos.bech32ToAddress(b[0]), b[1]);
        return [Cosmos.bech32ToAddress(b[0]), new Balance(b[1])];
      });

      VariablesDate.set(
        `indexer_${app.provider.cosmosChainId}`,
        new Date(updates.last_update),
      );
    } catch (e) {
      Logger.error('onWalletsBalanceCheck', e);
      balances = await Promise.all(
        Wallet.getAll().map(w =>
          EthNetwork.getBalance(w.address).then(
            balance => [w.address, balance] as [string, Balance],
          ),
        ),
      );
    }

    app.onWalletsBalance(Object.fromEntries(balances));
  } catch (e) {
    Logger.error('onWalletsBalanceCheck', e);
  }
}
