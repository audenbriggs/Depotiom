import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, type Connector } from 'wagmi';
import {
  ARC_RPC_URL,
  WALLETCONNECT_ID,
  arcChain,
  isWalletConnectConfigured,
} from './chain';
import {
  EMPTY_WALLET_NOTICE_MESSAGE,
  emitWalletNotice,
  isEmptyWalletAccountError,
} from './walletErrorGuard';

const wallets = isWalletConnectConfigured
  ? [
      {
        groupName: 'Recommended',
        wallets: [injectedWallet, metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
      },
    ]
  : [
      {
        groupName: 'Browser Wallets',
        wallets: [injectedWallet],
      },
    ];

const connectors = connectorsForWallets(wallets, {
  appName: 'Depotiom',
  projectId: isWalletConnectConfigured ? WALLETCONNECT_ID : 'depotiom-browser-injected',
});

export const wagmiConfig = createConfig({
  chains: [arcChain],
  connectors,
  transports: {
    [arcChain.id]: http(ARC_RPC_URL),
  },
  ssr: false,
});

const patchedConnectors = new WeakSet<Connector>();

function guardConnector(connector: Connector): void {
  if (patchedConnectors.has(connector)) return;
  patchedConnectors.add(connector);

  const rawGetAccounts = connector.getAccounts?.bind(connector);
  if (rawGetAccounts) {
    connector.getAccounts = async () => {
      try {
        return await rawGetAccounts();
      } catch (err) {
        if (isEmptyWalletAccountError(err)) {
          return [];
        }
        throw err;
      }
    };
  }

  const rawConnect = connector.connect?.bind(connector);
  if (rawConnect) {
    connector.connect = async (params) => {
      try {
        return await rawConnect(params);
      } catch (err) {
        if (isEmptyWalletAccountError(err)) {
          emitWalletNotice(EMPTY_WALLET_NOTICE_MESSAGE);
          throw new Error(EMPTY_WALLET_NOTICE_MESSAGE);
        }
        throw err;
      }
    };
  }

  const rawOnConnect = connector.onConnect?.bind(connector);
  if (rawOnConnect) {
    connector.onConnect = async (connectInfo) => {
      try {
        await rawOnConnect(connectInfo);
      } catch (err) {
        if (!isEmptyWalletAccountError(err)) {
          throw err;
        }
      }
    };
  }

  const rawOnAccountsChanged = connector.onAccountsChanged?.bind(connector);
  if (rawOnAccountsChanged) {
    connector.onAccountsChanged = async (accounts) => {
      try {
        await rawOnAccountsChanged(accounts);
      } catch (err) {
        if (!isEmptyWalletAccountError(err)) {
          throw err;
        }
      }
    };
  }

  const rawOnDisconnect = connector.onDisconnect?.bind(connector);
  if (rawOnDisconnect) {
    connector.onDisconnect = async (error) => {
      try {
        await rawOnDisconnect(error);
      } catch (err) {
        if (!isEmptyWalletAccountError(err)) {
          throw err;
        }
      }
    };
  }
}

if (typeof window !== 'undefined') {
  for (const connector of wagmiConfig.connectors) {
    guardConnector(connector);
  }
  wagmiConfig._internal?.connectors?.subscribe((nextConnectors: readonly Connector[]) => {
    for (const connector of nextConnectors) {
      guardConnector(connector);
    }
  });
}
