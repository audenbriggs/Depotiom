import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Search, Plus } from 'lucide-react';
import { isContractConfigured } from '../config/chain';
import { useUserStreams, type StreamWithSync } from '../hooks/useDepotiomContract';
import { useLiveWithdrawable } from '../hooks/useLiveWithdrawable';
import { useTokenMeta } from '../hooks/useTokenMeta';
import {
  deriveStreamStatus,
  formatAddressShort,
  formatDurationHuman,
  formatTokenAmount,
  type StreamStatus,
} from '../utils/streamMath';
import { WalletGate } from '../components/WalletGate';
import { StatusPill } from '../components/StatusPill';
import { DecimalBalance } from '../components/DecimalBalance';
import { StreamProgressBar } from '../components/StreamProgressBar';

type RoleFilter = 'all' | 'receiving' | 'sending';
type StatusFilter = 'all' | StreamStatus;

export function MyStreamsPage() {
  return (
    <WalletGate
      title="Connect your wallet to view streams"
      description="Your incoming and outgoing pay streams are private to your connected wallet on Arc."
    >
      <MyStreamsContent />
    </WalletGate>
  );
}

function MyStreamsContent() {
  const { address } = useAccount();
  const { data: streams = [], isLoading, refetch } = useUserStreams(address);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const nowSec = Date.now() / 1000;
    const query = searchQuery.trim().toLowerCase();

    return streams.filter(({ stream }) => {
      const isRecipient = address && stream.recipient.toLowerCase() === address.toLowerCase();
      const isSender = address && stream.sender.toLowerCase() === address.toLowerCase();

      if (roleFilter === 'receiving' && !isRecipient) return false;
      if (roleFilter === 'sending' && !isSender) return false;

      const status = deriveStreamStatus(stream, nowSec);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (query) {
        const matchesId = stream.id.toString() === query;
        const matchesSender = stream.sender.toLowerCase().includes(query);
        const matchesRecipient = stream.recipient.toLowerCase().includes(query);
        if (!matchesId && !matchesSender && !matchesRecipient) return false;
      }

      return true;
    });
  }, [streams, address, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">Streams</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#FFF9EE] sm:text-4xl">
            My streams
          </h1>
          <p className="text-sm text-[#FFF9EE]/70">
            Track real-time balances across all incoming and outgoing streams for{' '}
            <span className="font-mono-tabular text-[#FFF9EE]">
              {address ? formatAddressShort(address) : ''}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#3A3A40] bg-transparent px-4 text-xs font-medium text-[#FFF9EE] transition hover:border-[#FFF9EE] hover:bg-[#1B1B20] whitespace-nowrap cursor-pointer"
          >
            Refresh
          </button>
          <Link
            to="/start"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-[#FF8A3D] px-4 text-xs font-semibold text-[#0E0E10] transition hover:brightness-110 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Start stream</span>
          </Link>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-[10px] border border-[#3A3A40] bg-[#141417] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] p-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'receiving', label: 'Receiving' },
              { id: 'sending', label: 'Sending' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-[#FF8A3D] text-[#0E0E10] font-semibold'
                  : 'text-[#FFF9EE]/70 hover:text-[#FFF9EE]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFF9EE]/45" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by ID or 0x address"
              aria-label="Filter streams by ID or address"
              className="h-10 w-full rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] pl-9 pr-3 text-xs text-[#FFF9EE] placeholder:text-[#FFF9EE]/40 focus:border-[#FF8A3D] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by stream status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] px-3 text-xs text-[#FFF9EE] focus:border-[#FF8A3D] focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="Streaming">Streaming</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {!isContractConfigured ? (
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-10 text-center">
          <h2 className="text-lg font-semibold text-[#FFF9EE]">Contract not configured yet</h2>
          <p className="mt-2 text-sm text-[#FFF9EE]/65">
            Once the Depotiom contract address is configured, streams for your connected wallet will
            appear here automatically.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3" aria-label="Loading streams">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-[10px] border border-[#3A3A40] bg-[#141417]"
            />
          ))}
        </div>
      ) : streams.length === 0 ? (
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-12 text-center">
          <h2 className="text-xl font-semibold text-[#FFF9EE]">No streams for this wallet yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#FFF9EE]/70">
            Any pay stream you create or receive with this wallet on Arc will appear here with live
            accrual tracking.
          </p>
          <div className="mt-6">
            <Link
              to="/start"
              className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#FF8A3D] px-6 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110"
            >
              Start a stream
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-10 text-center">
          <h2 className="text-lg font-semibold text-[#FFF9EE]">No streams match these filters</h2>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-[#3A3A40] px-4 text-xs font-medium text-[#FFF9EE] hover:border-[#FFF9EE] cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <StreamListRow
              key={item.stream.id.toString()}
              item={item}
              connectedAddress={address}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamListRow({
  item,
  connectedAddress,
}: {
  item: StreamWithSync;
  connectedAddress?: string;
}) {
  const { stream, syncedWithdrawable, syncedAtMs } = item;
  const tokenMeta = useTokenMeta(stream.token);
  const { withdrawable, progress, status } = useLiveWithdrawable(
    stream,
    syncedWithdrawable,
    syncedAtMs
  );

  const isRecipient =
    connectedAddress && stream.recipient.toLowerCase() === connectedAddress.toLowerCase();
  const counterparty = isRecipient ? stream.sender : stream.recipient;

  return (
    <Link
      to={`/streams/${stream.id.toString()}`}
      className="block rounded-[10px] border border-[#3A3A40] bg-[#141417] p-5 transition hover:border-[#FF8A3D] hover:bg-[#1B1B20]"
    >
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
        <div className="space-y-1.5 lg:col-span-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono-tabular text-xs font-semibold text-[#FFF9EE]/65">
              Stream #{stream.id.toString()}
            </span>
            <StatusPill status={status} />
            <span className="text-xs font-medium text-[#FF8A3D]">
              {isRecipient ? 'Receiving' : 'Sending'}
            </span>
          </div>
          <p className="font-mono-tabular text-sm text-[#FFF9EE]">
            {isRecipient ? 'From ' : 'To '}
            {formatAddressShort(counterparty)}
          </p>
        </div>

        <div className="space-y-2 lg:col-span-4">
          <div className="flex items-center justify-between text-xs text-[#FFF9EE]/65">
            <span>Progress ({formatDurationHuman(stream.duration)})</span>
            <span className="font-mono-tabular">{Math.round(progress)}%</span>
          </div>
          <StreamProgressBar progress={progress} active={status === 'Streaming'} />
          <p className="font-mono-tabular text-xs text-[#FFF9EE]/60">
            Total: {formatTokenAmount(stream.totalAmount, tokenMeta.decimals, 2)} {tokenMeta.symbol}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 lg:col-span-4 lg:justify-end">
          <div className="text-left lg:text-right">
            <p className="text-xs text-[#FFF9EE]/60">
              {isRecipient ? 'Withdrawable now' : 'Recipient accrued'}
            </p>
            <DecimalBalance
              formatted={formatTokenAmount(withdrawable, tokenMeta.decimals, 6)}
              symbol={tokenMeta.symbol}
              size="md"
              tone="lemon"
            />
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#FFF9EE]/50" />
        </div>
      </div>
    </Link>
  );
}
