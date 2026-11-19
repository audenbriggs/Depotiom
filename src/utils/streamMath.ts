import { formatUnits } from 'viem';

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
export type StreamStatus = 'Streaming' | 'Completed' | 'Cancelled' | 'Scheduled';

export interface LiveWithdrawableInput {
  startTimeSec: number;
  endTimeSec: number;
  totalAmount: bigint;
  withdrawnAmount: bigint;
  ratePerSecondWei?: bigint;
  cancelled: boolean;
  cancelledAtSec?: number;
  syncedWithdrawable?: bigint | null;
  syncedAtMs?: number | null;
  nowMs: number;
}

export function parseDurationToSeconds(value: number, unit: DurationUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const multipliers: Record<DurationUnit, number> = {
    minutes: 60,
    hours: 3600,
    days: 86400,
    weeks: 604800,
    months: 2592000, // 30-day standard month
  };
  return Math.floor(value * multipliers[unit]);
}

export function computeRatePerSecond(totalAmountWei: bigint, durationSeconds: number): bigint {
  if (totalAmountWei <= 0n || durationSeconds <= 0) return 0n;
  return totalAmountWei / BigInt(durationSeconds);
}

export function deriveStreamStatus(
  params: {
    startTime: number;
    endTime: number;
    totalAmount: bigint;
    withdrawnAmount: bigint;
    cancelled: boolean;
  },
  nowSec: number
): StreamStatus {
  if (params.cancelled) return 'Cancelled';
  if (nowSec < params.startTime) return 'Scheduled';
  if (nowSec >= params.endTime || params.withdrawnAmount >= params.totalAmount) return 'Completed';
  return 'Streaming';
}

export function calculateStreamProgress(
  startTimeSec: number,
  endTimeSec: number,
  nowSec: number,
  cancelled: boolean,
  cancelledAtSec?: number
): number {
  const duration = endTimeSec - startTimeSec;
  if (duration <= 0) return 0;

  const effectiveNow =
    cancelled && cancelledAtSec && cancelledAtSec > 0 ? Math.min(nowSec, cancelledAtSec) : nowSec;

  if (effectiveNow <= startTimeSec) return 0;
  if (effectiveNow >= endTimeSec) return 100;
  return Math.min(100, Math.max(0, ((effectiveNow - startTimeSec) / duration) * 100));
}

/**
 * Computes real-time withdrawable balance on the client using millisecond precision
 * from startTime, totalAmount/duration (or rate), and withdrawnAmount, then smoothly
 * re-anchors against the latest on-chain `withdrawable` view reading so there is zero drift.
 */
export function computeClientWithdrawable(input: LiveWithdrawableInput): bigint {
  const {
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount,
    ratePerSecondWei,
    cancelled,
    cancelledAtSec,
    syncedWithdrawable,
    syncedAtMs,
    nowMs,
  } = input;

  if (totalAmount <= 0n || withdrawnAmount >= totalAmount) return 0n;

  const maxRemaining = totalAmount - withdrawnAmount;
  const startMs = startTimeSec * 1000;
  const endMs = endTimeSec * 1000;
  const durationMs = endMs - startMs;

  if (durationMs <= 0) {
    return syncedWithdrawable !== undefined && syncedWithdrawable !== null
      ? minBigInt(syncedWithdrawable, maxRemaining)
      : 0n;
  }

  const effectiveEndMs =
    cancelled && cancelledAtSec && cancelledAtSec > 0 ? Math.min(endMs, cancelledAtSec * 1000) : endMs;

  const clampedNowMs = Math.min(Math.max(nowMs, startMs), effectiveEndMs);

  // If we have a recent on-chain sync snapshot, project forward cleanly from that exact reading
  // using the stream's rate so the counter never jumps or drifts against contract math.
  if (syncedWithdrawable !== undefined && syncedWithdrawable !== null && syncedAtMs !== undefined && syncedAtMs !== null) {
    if (cancelled || clampedNowMs <= startMs) {
      return minBigInt(syncedWithdrawable, maxRemaining);
    }

    const syncClampedMs = Math.min(Math.max(syncedAtMs, startMs), effectiveEndMs);
    const deltaMs = Math.max(0, clampedNowMs - syncClampedMs);

    const deltaAccrued =
      ratePerSecondWei && ratePerSecondWei > 0n
        ? (ratePerSecondWei * BigInt(Math.floor(deltaMs))) / 1000n
        : (totalAmount * BigInt(Math.floor(deltaMs))) / BigInt(durationMs);

    return minBigInt(syncedWithdrawable + deltaAccrued, maxRemaining);
  }

  // Fallback client calculation before first sync completes
  if (clampedNowMs <= startMs) return 0n;
  if (clampedNowMs >= endMs && !cancelled) return maxRemaining;

  const elapsedMs = BigInt(Math.floor(clampedNowMs - startMs));
  const accrued = (totalAmount * elapsedMs) / BigInt(durationMs);
  const net = accrued > withdrawnAmount ? accrued - withdrawnAmount : 0n;
  return minBigInt(net, maxRemaining);
}

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function formatTokenAmount(
  amountWei: bigint,
  decimals: number,
  displayDecimals = 6
): string {
  const raw = formatUnits(amountWei, decimals);
  const [intPart, fracPart = ''] = raw.split('.');
  const formattedInt = Number(intPart).toLocaleString('en-US');
  if (displayDecimals <= 0) return formattedInt;
  const paddedFrac = fracPart.padEnd(displayDecimals, '0').slice(0, displayDecimals);
  return `${formattedInt}.${paddedFrac}`;
}

export function splitDecimalParts(
  formattedAmount: string,
  primaryDecimals = 2
): { primary: string; tail: string } {
  const dotIndex = formattedAmount.indexOf('.');
  if (dotIndex === -1) {
    return { primary: formattedAmount, tail: '' };
  }
  const intAndDot = formattedAmount.slice(0, dotIndex + 1);
  const frac = formattedAmount.slice(dotIndex + 1);
  const primaryFrac = frac.slice(0, primaryDecimals);
  const tailFrac = frac.slice(primaryDecimals);
  return {
    primary: `${intAndDot}${primaryFrac}`,
    tail: tailFrac,
  };
}

export function formatAddressShort(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDurationHuman(seconds: number): string {
  if (seconds <= 0) return '0 seconds';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return '—';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
