import { useCallback, useState } from 'react';
import { usePublicClient, useSwitchChain, useAccount } from 'wagmi';
import type { Hash } from 'viem';
import { ARC_CHAIN_ID } from '../config/chain';

export type TxStage = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

export interface TxState {
  stage: TxStage;
  label: string;
  hash?: Hash;
  errorMessage?: string;
}

function formatContractError(err: unknown): string {
  if (!err) return 'Transaction failed';
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied')) {
    return 'Transaction was rejected in your wallet.';
  }
  const shortMatch = msg.match(/ShortMessage:\s*([^\n]+)/i);
  if (shortMatch?.[1]) return shortMatch[1].trim();
  const reasonMatch = msg.match(/reverted with the following reason:\s*([^\n]+)/i);
  if (reasonMatch?.[1]) return reasonMatch[1].trim();
  if (msg.length > 160) return `${msg.slice(0, 157)}...`;
  return msg;
}

export function useTxLifecycle() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const [txState, setTxState] = useState<TxState>({
    stage: 'idle',
    label: '',
  });

  const reset = useCallback(() => {
    setTxState({ stage: 'idle', label: '' });
  }, []);

  const execute = useCallback(
    async (label: string, sendTx: () => Promise<Hash>): Promise<Hash | null> => {
      try {
        if (chainId !== ARC_CHAIN_ID) {
          setTxState({ stage: 'pending', label: 'Switching network to Arc' });
          await switchChainAsync({ chainId: ARC_CHAIN_ID });
        }

        setTxState({ stage: 'pending', label });
        const hash = await sendTx();

        setTxState({ stage: 'confirming', label, hash });

        if (!publicClient) {
          throw new Error('Arc RPC client is unavailable.');
        }

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted on Arc.');
        }

        setTxState({ stage: 'confirmed', label, hash });
        return hash;
      } catch (err) {
        setTxState({
          stage: 'error',
          label,
          errorMessage: formatContractError(err),
        });
        return null;
      }
    },
    [chainId, publicClient, switchChainAsync]
  );

  return {
    txState,
    execute,
    reset,
    isBusy: txState.stage === 'pending' || txState.stage === 'confirming',
  };
}
