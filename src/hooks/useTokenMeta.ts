import { useAccount, useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { erc20Abi } from '../abi/erc20';
import { ARC_CHAIN_ID, CONTRACT_ADDRESS, SUPPORTED_TOKENS } from '../config/chain';

export interface TokenLiveInfo {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

export function useTokenMeta(tokenAddress: Address): TokenLiveInfo {
  const { address: userAddress } = useAccount();
  const known = SUPPORTED_TOKENS.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );

  const decimalsQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId: ARC_CHAIN_ID,
  });

  const symbolQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId: ARC_CHAIN_ID,
  });

  const balanceQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(userAddress),
      refetchInterval: 15_000,
    },
  });

  const allowanceQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: userAddress && CONTRACT_ADDRESS ? [userAddress, CONTRACT_ADDRESS] : undefined,
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(userAddress && CONTRACT_ADDRESS),
      refetchInterval: 15_000,
    },
  });

  const decimals =
    typeof decimalsQuery.data === 'number'
      ? decimalsQuery.data
      : (known?.fallbackDecimals ?? 6);

  const symbol =
    typeof symbolQuery.data === 'string' ? symbolQuery.data : (known?.symbol ?? 'TOKEN');

  const balance = typeof balanceQuery.data === 'bigint' ? balanceQuery.data : 0n;
  const allowance = typeof allowanceQuery.data === 'bigint' ? allowanceQuery.data : 0n;

  const refetch = async () => {
    await Promise.all([
      decimalsQuery.refetch(),
      symbolQuery.refetch(),
      userAddress ? balanceQuery.refetch() : Promise.resolve(),
      userAddress && CONTRACT_ADDRESS ? allowanceQuery.refetch() : Promise.resolve(),
    ]);
  };

  return {
    address: tokenAddress,
    symbol,
    decimals,
    balance,
    allowance,
    isLoading:
      decimalsQuery.isLoading ||
      symbolQuery.isLoading ||
      balanceQuery.isLoading ||
      allowanceQuery.isLoading,
    refetch,
  };
}
