import { defineChain, isAddress, type Address } from 'viem';

export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
export const ARC_EXPLORER_URL = 'https://testnet.arcscan.app';

export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: ARC_EXPLORER_URL,
    },
  },
});

export interface SupportedToken {
  symbol: 'USDC' | 'EURC';
  name: string;
  address: Address;
  fallbackDecimals: number;
}

export const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
    fallbackDecimals: 6,
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    fallbackDecimals: 6,
  },
];

export function findTokenByAddress(address?: string | null): SupportedToken | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return SUPPORTED_TOKENS.find((token) => token.address.toLowerCase() === lower);
}

function readEnvValue(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return '';
  }
  return trimmed;
}

export const CONTRACT_ADDRESS_RAW = readEnvValue(import.meta.env.VITE_CONTRACT_ADDRESS);
export const CONTRACT_ADDRESS: Address | undefined = isAddress(CONTRACT_ADDRESS_RAW)
  ? CONTRACT_ADDRESS_RAW
  : undefined;

export const WALLETCONNECT_ID = readEnvValue(import.meta.env.VITE_WALLETCONNECT_ID);

export const ADMIN_WALLET_RAW = readEnvValue(import.meta.env.VITE_ADMIN_WALLET);
export const ADMIN_WALLET: Address | undefined = isAddress(ADMIN_WALLET_RAW)
  ? ADMIN_WALLET_RAW
  : undefined;

export const isContractConfigured = Boolean(CONTRACT_ADDRESS);
export const isWalletConnectConfigured = Boolean(WALLETCONNECT_ID);

export function getTxExplorerUrl(hash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}
