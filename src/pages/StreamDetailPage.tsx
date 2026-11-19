import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';
import {
  ADMIN_WALLET,
  ARC_CHAIN_ID,
  CONTRACT_ADDRESS,
  getAddressExplorerUrl,
  isContractConfigured,
} from '../config/chain';
import { erc20Abi } from '../abi/erc20';
import { useContractAbi } from '../hooks/useContractAbi';
import { useSingleStream } from '../hooks/useDepotiomContract';
import { useLiveWithdrawable } from '../hooks/useLiveWithdrawable';
import { useTokenMeta } from '../hooks/useTokenMeta';
import { useTxLifecycle } from '../hooks/useTxLifecycle';
import {
  formatDurationHuman,
  formatTimestamp,
  formatTokenAmount,
} from '../utils/streamMath';
import { WalletGate } from '../components/WalletGate';
import { DecimalBalance } from '../components/DecimalBalance';
import { StreamProgressBar } from '../components/StreamProgressBar';
import { StatusPill } from '../components/StatusPill';
import { TxStatusPanel } from '../components/TxStatusPanel';

export function StreamDetailPage() {
  const { id } = useParams<{ id: string }>();

  let parsedId: bigint | undefined;
  try {
    if (id && /^\d+$/.test(id)) {
      parsedId = BigInt(id);
    }
  } catch {
    parsedId = undefined;
  }

  return (
    <WalletGate
      title="Connect your wallet to inspect stream"
      description="Stream details and management actions are available only to the connected sender or recipient wallet."
    >
      <StreamDetailContent streamId={parsedId} />
    </WalletGate>
  );
}

function StreamDetailContent({ streamId }: { streamId?: bigint }) {
  const { address } = useAccount();
  const { abi, functions } = useContractAbi();
  const { writeContractAsync } = useWriteContract();
  const { txState, execute, reset, isBusy } = useTxLifecycle();

  const { data, isLoading, refetch } = useSingleStream(streamId);
  const stream = data?.stream;

  const tokenAddress = (stream?.token ?? '0x3600000000000000000000000000000000000000') as Address;
  const tokenMeta = useTokenMeta(tokenAddress);
  const { withdrawable, progress, status } = useLiveWithdrawable(
    stream,
    data?.syncedWithdrawable,
    data?.syncedAtMs
  );

  const [topUpInput, setTopUpInput] = useState('');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<'sender' | 'recipient' | null>(null);

  if (streamId === undefined) {
    return (
      <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-8 text-center">
        <h1 className="text-xl font-semibold text-[#FFF9EE]">Invalid stream identifier</h1>
        <Link
          to="/streams"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[#FF8A3D] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Streams
        </Link>
      </div>
    );
  }

  if (!isContractConfigured) {
    return (
      <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-8 text-center">
        <h1 className="text-xl font-semibold text-[#FFF9EE]">Contract not configured yet</h1>
        <p className="mt-2 text-sm text-[#FFF9EE]/65">
          Configure the deployed contract address to load stream #{streamId.toString()}.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-[10px] border border-[#3A3A40] bg-[#141417]" />
        <div className="h-64 animate-pulse rounded-[10px] border border-[#3A3A40] bg-[#141417]" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-10 text-center">
        <h1 className="text-xl font-semibold text-[#FFF9EE]">
          Stream #{streamId.toString()} not found
        </h1>
        <p className="mt-2 text-sm text-[#FFF9EE]/65">
          No active or historical stream exists for this identifier on Arc.
        </p>
        <Link
          to="/streams"
          className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[#3A3A40] px-4 py-2 text-sm text-[#FFF9EE] hover:border-[#FFF9EE]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Streams
        </Link>
      </div>
    );
  }

  const isSender = Boolean(address && stream.sender.toLowerCase() === address.toLowerCase());
  const isRecipient = Boolean(address && stream.recipient.toLowerCase() === address.toLowerCase());
  const isAdmin = Boolean(
    address && ADMIN_WALLET && ADMIN_WALLET.toLowerCase() === address.toLowerCase()
  );

  if (!isSender && !isRecipient && !isAdmin) {
    return (
      <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-10 text-center">
        <h1 className="text-xl font-semibold text-[#FFF9EE]">This stream belongs to another wallet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#FFF9EE]/70">
          Wallet-specific stream details are restricted to the sender or recipient wallet. Switch
          accounts to inspect streams owned by another address.
        </p>
        <Link
          to="/streams"
          className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[#3A3A40] px-4 py-2 text-sm text-[#FFF9EE] hover:border-[#FFF9EE]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Streams
        </Link>
      </div>
    );
  }

  const copyAddr = (field: 'sender' | 'recipient', value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1500);
  };

  let parsedTopUp = 0n;
  let topUpError = '';
  if (topUpInput.trim() !== '') {
    try {
      parsedTopUp = parseUnits(topUpInput.trim(), tokenMeta.decimals);
      if (parsedTopUp <= 0n) {
        topUpError = 'Enter an amount greater than 0.';
      } else if (parsedTopUp > tokenMeta.balance) {
        topUpError = `Insufficient ${tokenMeta.symbol} balance in connected wallet.`;
      }
    } catch {
      topUpError = 'Enter a valid numeric amount.';
    }
  }

  const topUpNeedsApprove =
    parsedTopUp > 0n && tokenMeta.allowance < parsedTopUp;

  const handleWithdraw = async () => {
    const contractAddress = CONTRACT_ADDRESS;
    if (!contractAddress || !isRecipient || withdrawable <= 0n) return;
    const fnName = functions.withdraw?.name ?? 'withdraw';
    const hash = await execute('Withdraw accrued pay', () =>
      writeContractAsync({
        address: contractAddress,
        abi,
        functionName: fnName,
        args: [stream.id],
        chainId: ARC_CHAIN_ID,
      })
    );
    if (hash) {
      await Promise.all([refetch(), tokenMeta.refetch()]);
    }
  };

  const handleTopUp = async () => {
    const contractAddress = CONTRACT_ADDRESS;
    if (!contractAddress || !isSender || parsedTopUp <= 0n || parsedTopUp > tokenMeta.balance) {
      return;
    }

    if (topUpNeedsApprove) {
      const approveHash = await execute(`Approve ${tokenMeta.symbol}`, () =>
        writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, parsedTopUp],
          chainId: ARC_CHAIN_ID,
        })
      );
      if (approveHash) {
        await tokenMeta.refetch();
      }
      return;
    }

    const fnName = functions.topUp?.name ?? 'topUp';
    const hash = await execute('Top up stream', () =>
      writeContractAsync({
        address: contractAddress,
        abi,
        functionName: fnName,
        args: [stream.id, parsedTopUp],
        chainId: ARC_CHAIN_ID,
      })
    );
    if (hash) {
      setTopUpInput('');
      await Promise.all([refetch(), tokenMeta.refetch()]);
    }
  };

  const handleCancel = async () => {
    const contractAddress = CONTRACT_ADDRESS;
    if (!contractAddress || !isSender || stream.cancelled) return;
    const fnName = functions.cancel?.name ?? 'cancel';
    const hash = await execute('Cancel stream', () =>
      writeContractAsync({
        address: contractAddress,
        abi,
        functionName: fnName,
        args: [stream.id],
        chainId: ARC_CHAIN_ID,
      })
    );
    if (hash) {
      setConfirmCancelOpen(false);
      await Promise.all([refetch(), tokenMeta.refetch()]);
    }
  };

  const unwithdrawnRemaining =
    stream.totalAmount > stream.withdrawnAmount
      ? stream.totalAmount - stream.withdrawnAmount
      : 0n;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/streams"
          className="inline-flex items-center gap-2 text-sm text-[#FFF9EE]/70 transition hover:text-[#FFF9EE]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Streams</span>
        </Link>
        <div className="flex items-center gap-3">
          <StatusPill status={status} />
          <span className="text-xs font-medium text-[#FF8A3D]">
            {isRecipient && isSender
              ? 'Sender and recipient'
              : isRecipient
                ? 'Recipient view'
                : 'Sender view'}
          </span>
        </div>
      </div>

      {/* Header & Live Accrual Card */}
      <section className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-mono-tabular text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
              Stream #{stream.id.toString()}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#FFF9EE]">
              Stream overview
            </h1>
            <p className="text-xs font-mono-tabular text-[#FFE45E]">
              +{formatTokenAmount(stream.ratePerSecond, tokenMeta.decimals, 6)} {tokenMeta.symbol}{' '}
              / sec
            </p>
          </div>

          <div className="space-y-1 lg:text-right">
            <p className="text-xs uppercase tracking-wider text-[#FFF9EE]/60">
              Withdrawable right now
            </p>
            <DecimalBalance
              formatted={formatTokenAmount(withdrawable, tokenMeta.decimals, 6)}
              symbol={tokenMeta.symbol}
              size="xl"
              tone="lemon"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <StreamProgressBar progress={progress} active={status === 'Streaming'} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#FFF9EE]/60 font-mono-tabular">
            <span>{formatTimestamp(stream.startTime)}</span>
            <span>{progress.toFixed(2)}% streamed</span>
            <span>{formatTimestamp(stream.endTime)}</span>
          </div>
        </div>
      </section>

      <TxStatusPanel txState={txState} onDismiss={reset} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Stream Terms & Ledger */}
        <section className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 sm:p-8 space-y-5 lg:col-span-7">
          <h2 className="text-lg font-semibold text-[#FFF9EE]">Agreement ledger</h2>

          <dl className="divide-y divide-[#3A3A40] text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3.5">
              <dt className="text-[#FFF9EE]/65">Sender</dt>
              <dd className="flex items-center gap-2 font-mono-tabular text-[#FFF9EE]">
                <span>{stream.sender}</span>
                <button
                  type="button"
                  aria-label="Copy sender address"
                  onClick={() => copyAddr('sender', stream.sender)}
                  className="text-[#FFF9EE]/60 hover:text-[#FFF9EE] cursor-pointer"
                >
                  {copiedField === 'sender' ? (
                    <Check className="h-3.5 w-3.5 text-[#FFE45E]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <a
                  href={getAddressExplorerUrl(stream.sender)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open sender address on ArcScan"
                  className="text-[#FFF9EE]/60 hover:text-[#FF8A3D]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 py-3.5">
              <dt className="text-[#FFF9EE]/65">Recipient</dt>
              <dd className="flex items-center gap-2 font-mono-tabular text-[#FFF9EE]">
                <span>{stream.recipient}</span>
                <button
                  type="button"
                  aria-label="Copy recipient address"
                  onClick={() => copyAddr('recipient', stream.recipient)}
                  className="text-[#FFF9EE]/60 hover:text-[#FFF9EE] cursor-pointer"
                >
                  {copiedField === 'recipient' ? (
                    <Check className="h-3.5 w-3.5 text-[#FFE45E]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <a
                  href={getAddressExplorerUrl(stream.recipient)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open recipient address on ArcScan"
                  className="text-[#FFF9EE]/60 hover:text-[#FF8A3D]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[#FFF9EE]/65">Total deposited</dt>
              <dd className="font-mono-tabular font-medium text-[#FFF9EE]">
                {formatTokenAmount(stream.totalAmount, tokenMeta.decimals, 4)} {tokenMeta.symbol}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[#FFF9EE]/65">Withdrawn so far</dt>
              <dd className="font-mono-tabular font-medium text-[#FFF9EE]">
                {formatTokenAmount(stream.withdrawnAmount, tokenMeta.decimals, 4)}{' '}
                {tokenMeta.symbol}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[#FFF9EE]/65">Total remaining in stream</dt>
              <dd className="font-mono-tabular font-medium text-[#FFF9EE]">
                {formatTokenAmount(unwithdrawnRemaining, tokenMeta.decimals, 4)} {tokenMeta.symbol}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[#FFF9EE]/65">Duration</dt>
              <dd className="font-mono-tabular text-[#FFF9EE]">
                {formatDurationHuman(stream.duration)}
              </dd>
            </div>

            {stream.cancelled && stream.cancelledAt > 0 ? (
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-[#FFB4AB]">Cancelled at</dt>
                <dd className="font-mono-tabular text-[#FFB4AB]">
                  {formatTimestamp(stream.cancelledAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* Role-specific Actions */}
        <aside className="space-y-6 lg:col-span-5">
          {isRecipient ? (
            <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#FFF9EE]">Withdraw accrued pay</h2>
              <p className="text-sm text-[#FFF9EE]/70">
                Available to claim now:{' '}
                <span className="font-mono-tabular font-semibold text-[#FFE45E]">
                  {formatTokenAmount(withdrawable, tokenMeta.decimals, 6)} {tokenMeta.symbol}
                </span>
              </p>
              <button
                type="button"
                disabled={isBusy || withdrawable <= 0n}
                onClick={() => void handleWithdraw()}
                className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#FF8A3D] px-5 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                {isBusy ? 'Processing...' : `Withdraw ${tokenMeta.symbol}`}
              </button>
            </div>
          ) : null}

          {isSender && !stream.cancelled ? (
            <>
              <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#FFF9EE]">Top up stream</h2>
                <p className="text-xs text-[#FFF9EE]/65">
                  Wallet balance: {formatTokenAmount(tokenMeta.balance, tokenMeta.decimals, 2)}{' '}
                  {tokenMeta.symbol}
                </p>
                <div className="flex items-center overflow-hidden rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] focus-within:border-[#FF8A3D]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={topUpInput}
                    onChange={(e) => setTopUpInput(e.target.value)}
                    placeholder="0.00"
                    aria-label="Top up amount"
                    className="w-full bg-transparent px-4 py-2.5 font-mono-tabular text-sm text-[#FFF9EE] placeholder:text-[#FFF9EE]/35 focus:outline-none"
                  />
                  <span className="border-l border-[#3A3A40] px-3 py-2.5 text-xs font-semibold text-[#FFF9EE]/80">
                    {tokenMeta.symbol}
                  </span>
                </div>
                {topUpError ? <p className="text-xs text-[#FFB4AB]">{topUpError}</p> : null}
                <button
                  type="button"
                  disabled={isBusy || parsedTopUp <= 0n || parsedTopUp > tokenMeta.balance}
                  onClick={() => void handleTopUp()}
                  className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#FF8A3D] px-5 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  {isBusy
                    ? 'Processing...'
                    : topUpNeedsApprove
                      ? `Approve ${tokenMeta.symbol}`
                      : 'Top up stream'}
                </button>
              </div>

              <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#FFF9EE]">Cancel stream</h2>
                <p className="text-xs leading-relaxed text-[#FFF9EE]/70">
                  Cancelling immediately settles all accrued {tokenMeta.symbol} to the recipient and
                  returns the remaining unstreamed funds to your wallet.
                </p>
                {!confirmCancelOpen ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmCancelOpen(true)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-[#FFB4AB]/60 bg-transparent px-5 text-sm font-medium text-[#FFB4AB] transition hover:bg-[#FFB4AB]/10 cursor-pointer"
                  >
                    Cancel stream
                  </button>
                ) : (
                  <div className="space-y-3 rounded-[10px] border border-[#FFB4AB]/50 bg-[#0E0E10] p-4">
                    <p className="text-xs font-medium text-[#FFF9EE]">
                      Confirm stream cancellation on Arc
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleCancel()}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-[10px] bg-[#FFB4AB] px-4 text-xs font-semibold text-[#0E0E10] hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      >
                        Confirm cancel
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmCancelOpen(false)}
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#3A3A40] px-4 text-xs font-medium text-[#FFF9EE] hover:border-[#FFF9EE] cursor-pointer"
                      >
                        Keep active
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
