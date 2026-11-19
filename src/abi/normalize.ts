import type { Abi, AbiFunction, Address } from 'viem';

export interface StreamRecord {
  id: bigint;
  sender: Address;
  recipient: Address;
  token: Address;
  totalAmount: bigint;
  withdrawnAmount: bigint;
  startTime: number;
  endTime: number;
  duration: number;
  ratePerSecond: bigint;
  cancelled: boolean;
  cancelledAt: number;
}

export interface PlatformStats {
  totalStreams: bigint;
  activeStreams: bigint;
  usdcVolume: bigint;
  eurcVolume: bigint;
}

export interface ResolvedContractFunctions {
  createStream: AbiFunction | null;
  withdraw: AbiFunction | null;
  topUp: AbiFunction | null;
  cancel: AbiFunction | null;
  getStream: AbiFunction | null;
  withdrawable: AbiFunction | null;
  streamsBySender: AbiFunction | null;
  streamsByRecipient: AbiFunction | null;
  platformStats: AbiFunction | null;
  totalStreamsCount: AbiFunction | null;
}

export const FALLBACK_DEPOTIOM_ABI = [
  {
    type: 'function',
    name: 'createStream',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [{ name: 'streamId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'topUp',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'streamId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancel',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getStream',
    stateMutability: 'view',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: [
      {
        name: 'stream',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'withdrawnAmount', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'ratePerSecond', type: 'uint256' },
          { name: 'cancelled', type: 'bool' },
          { name: 'cancelledAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'withdrawable',
    stateMutability: 'view',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'streamsBySender',
    stateMutability: 'view',
    inputs: [{ name: 'sender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'streamsByRecipient',
    stateMutability: 'view',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getPlatformStats',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalStreams', type: 'uint256' },
      { name: 'activeStreams', type: 'uint256' },
      { name: 'usdcVolume', type: 'uint256' },
      { name: 'eurcVolume', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

function pickFunction(
  functions: AbiFunction[],
  candidates: string[],
  predicate?: (fn: AbiFunction) => boolean
): AbiFunction | null {
  for (const candidate of candidates) {
    const exact = functions.find(
      (fn) => fn.name.toLowerCase() === candidate.toLowerCase() && (!predicate || predicate(fn))
    );
    if (exact) return exact;
  }
  if (predicate) {
    for (const candidate of candidates) {
      const partial = functions.find(
        (fn) => fn.name.toLowerCase().includes(candidate.toLowerCase()) && predicate(fn)
      );
      if (partial) return partial;
    }
  }
  return null;
}

export function resolveAbiFunctions(abi: Abi): ResolvedContractFunctions {
  const functions = abi.filter((item): item is AbiFunction => item.type === 'function');

  return {
    createStream: pickFunction(
      functions,
      ['createStream', 'startStream', 'create', 'openStream'],
      (fn) => fn.inputs.length === 4 && fn.stateMutability !== 'view' && fn.stateMutability !== 'pure'
    ),
    withdraw: pickFunction(
      functions,
      ['withdraw', 'withdrawFromStream', 'claim', 'claimStream'],
      (fn) => (fn.inputs.length === 1 || fn.inputs.length === 2) && fn.stateMutability !== 'view'
    ),
    topUp: pickFunction(
      functions,
      ['topUp', 'topUpStream', 'fundStream', 'addFunds'],
      (fn) => fn.inputs.length === 2 && fn.stateMutability !== 'view'
    ),
    cancel: pickFunction(
      functions,
      ['cancel', 'cancelStream', 'stopStream'],
      (fn) => fn.inputs.length === 1 && fn.stateMutability !== 'view'
    ),
    getStream: pickFunction(
      functions,
      ['getStream', 'streams', 'streamOf', 'getStreamDetails'],
      (fn) => fn.inputs.length === 1 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
    withdrawable: pickFunction(
      functions,
      ['withdrawable', 'withdrawableAmount', 'getWithdrawableAmount', 'getWithdrawable', 'withdrawableOf', 'accruedOf'],
      (fn) => fn.inputs.length === 1 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
    streamsBySender: pickFunction(
      functions,
      ['streamsBySender', 'getStreamsBySender', 'getSenderStreams', 'senderStreams'],
      (fn) => fn.inputs.length === 1 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
    streamsByRecipient: pickFunction(
      functions,
      ['streamsByRecipient', 'getStreamsByRecipient', 'getRecipientStreams', 'recipientStreams'],
      (fn) => fn.inputs.length === 1 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
    platformStats: pickFunction(
      functions,
      ['getPlatformStats', 'platformStats', 'getStats', 'stats'],
      (fn) => fn.inputs.length === 0 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
    totalStreamsCount: pickFunction(
      functions,
      ['totalStreams', 'nextStreamId', 'streamCount'],
      (fn) => fn.inputs.length === 0 && (fn.stateMutability === 'view' || fn.stateMutability === 'pure')
    ),
  };
}

function toBigIntSafe(val: unknown): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number' && Number.isFinite(val)) return BigInt(Math.trunc(val));
  if (typeof val === 'string' && val.length > 0) return BigInt(val);
  return 0n;
}

function toNumberSafe(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'string' && val.length > 0) return Number(val);
  return 0;
}

export function normalizeStreamResult(streamId: bigint, raw: unknown): StreamRecord | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    // Handle positional tuple outputs
    const sender = String(raw[0] ?? '') as Address;
    const recipient = String(raw[1] ?? '') as Address;
    const token = String(raw[2] ?? '') as Address;
    const totalAmount = toBigIntSafe(raw[3]);
    const withdrawnAmount = toBigIntSafe(raw[4]);
    const startTime = toNumberSafe(raw[5]);
    const endOrDuration = toNumberSafe(raw[6]);
    const seventh = raw[7];
    const eighth = raw[8];
    const ninth = raw[9];

    let endTime = endOrDuration;
    if (endTime > 0 && endTime < 1_000_000_000 && startTime > 1_000_000_000) {
      endTime = startTime + endTime;
    }
    const duration = Math.max(0, endTime - startTime);

    let ratePerSecond = 0n;
    let cancelled = false;
    let cancelledAt = 0;

    if (typeof seventh === 'boolean') {
      cancelled = seventh;
      cancelledAt = toNumberSafe(eighth);
      ratePerSecond = duration > 0 ? totalAmount / BigInt(duration) : 0n;
    } else {
      ratePerSecond = toBigIntSafe(seventh);
      cancelled = Boolean(eighth);
      cancelledAt = toNumberSafe(ninth);
    }

    if (!sender || sender === '0x0000000000000000000000000000000000000000') return null;

    return {
      id: streamId,
      sender,
      recipient,
      token,
      totalAmount,
      withdrawnAmount,
      startTime,
      endTime,
      duration,
      ratePerSecond,
      cancelled,
      cancelledAt,
    };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const sender = String(obj.sender ?? obj.from ?? '') as Address;
    const recipient = String(obj.recipient ?? obj.to ?? '') as Address;
    const token = String(obj.token ?? obj.tokenAddress ?? '') as Address;
    const totalAmount = toBigIntSafe(obj.totalAmount ?? obj.deposit ?? obj.amount ?? 0);
    const withdrawnAmount = toBigIntSafe(obj.withdrawnAmount ?? obj.withdrawn ?? 0);
    const startTime = toNumberSafe(obj.startTime ?? obj.start ?? 0);
    const rawEnd = toNumberSafe(obj.endTime ?? obj.stopTime ?? obj.end ?? 0);
    const rawDur = toNumberSafe(obj.duration ?? 0);
    const endTime = rawEnd > 0 ? rawEnd : startTime + rawDur;
    const duration = rawDur > 0 ? rawDur : Math.max(0, endTime - startTime);
    const ratePerSecond =
      obj.ratePerSecond !== undefined
        ? toBigIntSafe(obj.ratePerSecond)
        : duration > 0
          ? totalAmount / BigInt(duration)
          : 0n;
    const cancelled = Boolean(obj.cancelled ?? obj.isCancelled ?? obj.canceled ?? false);
    const cancelledAt = toNumberSafe(obj.cancelledAt ?? obj.canceledAt ?? obj.stopTime ?? 0);

    if (!sender || sender === '0x0000000000000000000000000000000000000000') return null;

    return {
      id: streamId,
      sender,
      recipient,
      token,
      totalAmount,
      withdrawnAmount,
      startTime,
      endTime,
      duration,
      ratePerSecond,
      cancelled,
      cancelledAt,
    };
  }

  return null;
}

export function normalizePlatformStats(raw: unknown): PlatformStats | null {
  if (raw === undefined || raw === null) return null;

  if (Array.isArray(raw)) {
    return {
      totalStreams: toBigIntSafe(raw[0]),
      activeStreams: toBigIntSafe(raw[1]),
      usdcVolume: toBigIntSafe(raw[2]),
      eurcVolume: toBigIntSafe(raw[3]),
    };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      totalStreams: toBigIntSafe(obj.totalStreams ?? obj.streamCount ?? 0),
      activeStreams: toBigIntSafe(obj.activeStreams ?? obj.activeCount ?? 0),
      usdcVolume: toBigIntSafe(obj.usdcVolume ?? obj.totalUsdc ?? obj.totalVolume ?? 0),
      eurcVolume: toBigIntSafe(obj.eurcVolume ?? obj.totalEurc ?? 0),
    };
  }

  return null;
}
