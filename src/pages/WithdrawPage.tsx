import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import { ARC_CHAIN_ID, CONTRACT_ADDRESS, isContractConfigured } from '../config/chain';
import { useContractAbi } from '../hooks/useContractAbi';
import { useUserStreams, type StreamWithSync } from '../hooks/useDepotiomContract';
import { useLiveWithdrawable } from '../hooks/useLiveWithdrawable';
import { useTokenMeta } from '../hooks/useTokenMeta';
import { useTxLifecycle } from '../hooks/useTxLifecycle';
import { formatAddressShort, formatTokenAmount } from '../utils/streamMath';
import { WalletGate } from '../components/WalletGate';
import { DecimalBalance } from '../components/DecimalBalance';
import { StatusPill } from '../components/StatusPill';
import { StreamProgressBar } from '../components/StreamProgressBar';
import { TxStatusPanel } from '../components/TxStatusPanel';

export function WithdrawPage() {
  return (
    <WalletGate
      title="Connect your wallet to withdraw"
      description="View all incoming streams paying your connected wallet and claim accrued USDC or EURC anytime."
    >
      <WithdrawContent />
    </WalletGate>
  );
}

function WithdrawContent() {
  const { address } = useAccount();
  const { abi, functions } = useContractAbi();
  const { writeContractAsync } = useWriteContract();
  const { txState, execute, reset, isBusy } = useTxLifecycle();
  const [activeStreamId, setActiveStreamId] = useState<bigint | null>(null);

  const { data: streams = [], isLoading, refetch } = useUserStreams(address);

  const incomingStreams = streams.filter(
    ({ stream }) => address && stream.recipient.toLowerCase() === address.toLowerCase()
  );

  const handleWithdrawStream = async (streamId: bigint, symbol: string) => {
    const contractAddress = CONTRACT_ADDRESS;
    if (!contractAddress) return;
    setActiveStreamId(streamId);
    const fnName = functions.withdraw?.name ?? 'withdraw';
    const hash = await execute(`Withdraw ${symbol} from stream #${streamId.toString()}`, () =>
      writeContractAsync({
        address: contractAddress,
        abi,
        functionName: fnName,
        args: [streamId],
        chainId: ARC_CHAIN_ID,
      })
    );
    setActiveStreamId(null);
    if (hash) {
      await refetch();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">Claim</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#FFF9EE] sm:text-4xl">
            Withdraw accrued pay
          </h1>
          <p className="text-sm text-[#FFF9EE]/70">
            Claim available USDC or EURC directly from your active incoming streams on Arc.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#3A3A40] bg-transparent px-4 text-xs font-medium text-[#FFF9EE] transition hover:border-[#FFF9EE] hover:bg-[#1B1B20] whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          Refresh balances
        </button>
      </div>

      <TxStatusPanel txState={txState} onDismiss={reset} />

      {!isContractConfigured ? (
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-10 text-center">
          <h2 className="text-lg font-semibold text-[#FFF9EE]">Contract not configured yet</h2>
          <p className="mt-2 text-sm text-[#FFF9EE]/65">
            Once the Depotiom contract address is configured, incoming streams will appear here.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3" aria-label="Loading incoming streams">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-[10px] border border-[#3A3A40] bg-[#141417]"
            />
          ))}
        </div>
      ) : incomingStreams.length === 0 ? (
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-12 text-center">
          <h2 className="text-xl font-semibold text-[#FFF9EE]">
            No incoming streams for this wallet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#FFF9EE]/70">
            When someone starts a pay stream to{' '}
            <span className="font-mono-tabular text-[#FFF9EE]">
              {address ? formatAddressShort(address) : ''}
            </span>
            , your claimable balance will tick live here.
          </p>
          <div className="mt-6">
            <Link
              to="/streams"
              className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#3A3A40] px-5 text-sm font-medium text-[#FFF9EE] transition hover:border-[#FFF9EE] hover:bg-[#1B1B20]"
            >
              View My Streams
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {incomingStreams.map((item) => (
            <WithdrawStreamCard
              key={item.stream.id.toString()}
              item={item}
              isBusy={isBusy && activeStreamId === item.stream.id}
              anyBusy={isBusy}
              onWithdraw={(symbol) => void handleWithdrawStream(item.stream.id, symbol)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawStreamCard({
  item,
  isBusy,
  anyBusy,
  onWithdraw,
}: {
  item: StreamWithSync;
  isBusy: boolean;
  anyBusy: boolean;
  onWithdraw: (symbol: string) => void;
}) {
  const { stream, syncedWithdrawable, syncedAtMs } = item;
  const tokenMeta = useTokenMeta(stream.token);
  const { withdrawable, progress, status } = useLiveWithdrawable(
    stream,
    syncedWithdrawable,
    syncedAtMs
  );

  return (
    <div className="flex flex-col justify-between rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/streams/${stream.id.toString()}`}
              className="font-mono-tabular text-xs font-semibold text-[#FFF9EE]/70 hover:text-[#FF8A3D]"
            >
              Stream #{stream.id.toString()}
            </Link>
            <StatusPill status={status} />
          </div>
          <p className="text-xs text-[#FFF9EE]/60 font-mono-tabular">
            From {formatAddressShort(stream.sender)}
          </p>
        </div>

        <Link
          to={`/streams/${stream.id.toString()}`}
          className="text-xs font-medium text-[#FFF9EE]/70 hover:text-[#FFF9EE] whitespace-nowrap"
        >
          Details
        </Link>
      </div>

      <div className="rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#FFF9EE]/60">
          <span>Available to claim</span>
          <span className="font-mono-tabular text-[#FFE45E]">
            +{formatTokenAmount(stream.ratePerSecond, tokenMeta.decimals, 6)} / sec
          </span>
        </div>
        <DecimalBalance
          formatted={formatTokenAmount(withdrawable, tokenMeta.decimals, 6)}
          symbol={tokenMeta.symbol}
          size="lg"
          tone="lemon"
        />
        <StreamProgressBar progress={progress} active={status === 'Streaming'} />
      </div>

      <button
        type="button"
        disabled={anyBusy || withdrawable <= 0n}
        onClick={() => onWithdraw(tokenMeta.symbol)}
        className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#FF8A3D] px-5 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
      >
        {isBusy ? 'Processing...' : `Withdraw ${tokenMeta.symbol}`}
      </button>
    </div>
  );
}
