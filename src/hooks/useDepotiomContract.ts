import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import {
  normalizePlatformStats,
  normalizeStreamResult,
  type PlatformStats,
  type StreamRecord,
} from '../abi/normalize';
import { ARC_CHAIN_ID, CONTRACT_ADDRESS } from '../config/chain';
import { useContractAbi } from './useContractAbi';

export interface StreamWithSync {
  stream: StreamRecord;
  syncedWithdrawable: bigint;
  syncedAtMs: number;
}

export function usePlatformStats() {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, functions } = useContractAbi();

  return useQuery<PlatformStats | null>({
    queryKey: ['platform-stats', CONTRACT_ADDRESS ?? 'none', functions.platformStats?.name ?? 'none'],
    enabled: Boolean(publicClient && CONTRACT_ADDRESS),
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!publicClient || !CONTRACT_ADDRESS) return null;

      if (functions.platformStats) {
        try {
          const res = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: functions.platformStats.name,
          });
          return normalizePlatformStats(res);
        } catch {
          // Fall through if count view exists
        }
      }

      if (functions.totalStreamsCount) {
        try {
          const count = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: functions.totalStreamsCount.name,
          });
          return {
            totalStreams: typeof count === 'bigint' ? count : BigInt(Number(count ?? 0)),
            activeStreams: 0n,
            usdcVolume: 0n,
            eurcVolume: 0n,
          };
        } catch {
          return null;
        }
      }

      return null;
    },
  });
}

export function useUserStreams(userAddress?: Address) {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, functions } = useContractAbi();

  return useQuery<StreamWithSync[]>({
    queryKey: [
      'user-streams',
      CONTRACT_ADDRESS ?? 'none',
      userAddress ?? 'disconnected',
      functions.getStream?.name ?? 'none',
    ],
    enabled: Boolean(publicClient && CONTRACT_ADDRESS && userAddress),
    refetchInterval: 15_000,
    queryFn: async () => {
      const contractAddress = CONTRACT_ADDRESS;
      if (!publicClient || !contractAddress || !userAddress) return [];

      const idSet = new Set<string>();

      const readIdList = async (fnName: string | undefined) => {
        if (!fnName) return;
        try {
          const rawIds = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: fnName,
            args: [userAddress],
          });
          if (Array.isArray(rawIds)) {
            for (const item of rawIds) {
              idSet.add(BigInt(item as bigint | number | string).toString());
            }
          }
        } catch {
          // Ignore single role view error if contract only supports one or reverts on empty
        }
      };

      await Promise.all([
        readIdList(functions.streamsBySender?.name),
        readIdList(functions.streamsByRecipient?.name),
      ]);

      const streamIds = Array.from(idSet)
        .map((s) => BigInt(s))
        .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));

      if (streamIds.length === 0 || !functions.getStream) return [];

      const syncedAtMs = Date.now();
      const results = await Promise.all(
        streamIds.map(async (streamId): Promise<StreamWithSync | null> => {
          try {
            const rawStream = await publicClient.readContract({
              address: contractAddress,
              abi,
              functionName: functions.getStream!.name,
              args: [streamId],
            });
            const normalized = normalizeStreamResult(streamId, rawStream);
            if (!normalized) return null;

            let syncedWithdrawable = 0n;
            if (functions.withdrawable) {
              try {
                const rawWithdrawable = await publicClient.readContract({
                  address: contractAddress,
                  abi,
                  functionName: functions.withdrawable.name,
                  args: [streamId],
                });
                syncedWithdrawable =
                  typeof rawWithdrawable === 'bigint'
                    ? rawWithdrawable
                    : BigInt(Number(rawWithdrawable ?? 0));
              } catch {
                syncedWithdrawable = 0n;
              }
            }

            return {
              stream: normalized,
              syncedWithdrawable,
              syncedAtMs,
            };
          } catch {
            return null;
          }
        })
      );

      return results.filter((item): item is StreamWithSync => item !== null);
    },
  });
}

export function useSingleStream(streamId?: bigint) {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, functions } = useContractAbi();

  return useQuery<StreamWithSync | null>({
    queryKey: [
      'single-stream',
      CONTRACT_ADDRESS ?? 'none',
      streamId?.toString() ?? 'none',
      functions.getStream?.name ?? 'none',
    ],
    enabled: Boolean(publicClient && CONTRACT_ADDRESS && streamId !== undefined && functions.getStream),
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!publicClient || !CONTRACT_ADDRESS || streamId === undefined || !functions.getStream) {
        return null;
      }

      const rawStream = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: functions.getStream.name,
        args: [streamId],
      });
      const normalized = normalizeStreamResult(streamId, rawStream);
      if (!normalized) return null;

      let syncedWithdrawable = 0n;
      const syncedAtMs = Date.now();
      if (functions.withdrawable) {
        try {
          const rawW = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: functions.withdrawable.name,
            args: [streamId],
          });
          syncedWithdrawable = typeof rawW === 'bigint' ? rawW : BigInt(Number(rawW ?? 0));
        } catch {
          syncedWithdrawable = 0n;
        }
      }

      return {
        stream: normalized,
        syncedWithdrawable,
        syncedAtMs,
      };
    },
  });
}
