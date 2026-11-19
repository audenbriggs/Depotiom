import { useEffect, useState } from 'react';
import type { StreamRecord } from '../abi/normalize';
import { calculateStreamProgress, computeClientWithdrawable, deriveStreamStatus, type StreamStatus } from '../utils/streamMath';

export interface LiveStreamMetrics {
  withdrawable: bigint;
  progress: number;
  status: StreamStatus;
  nowMs: number;
}

export function useLiveWithdrawable(
  stream: StreamRecord | null | undefined,
  syncedWithdrawable?: bigint | null,
  syncedAtMs?: number | null
): LiveStreamMetrics {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!stream || stream.cancelled) return;
    const nowSec = Date.now() / 1000;
    if (nowSec >= stream.endTime) {
      setNowMs(Date.now());
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => window.clearInterval(timer);
  }, [stream]);

  if (!stream) {
    return {
      withdrawable: 0n,
      progress: 0,
      status: 'Scheduled',
      nowMs,
    };
  }

  const nowSec = nowMs / 1000;
  const withdrawable = computeClientWithdrawable({
    startTimeSec: stream.startTime,
    endTimeSec: stream.endTime,
    totalAmount: stream.totalAmount,
    withdrawnAmount: stream.withdrawnAmount,
    ratePerSecondWei: stream.ratePerSecond,
    cancelled: stream.cancelled,
    cancelledAtSec: stream.cancelledAt,
    syncedWithdrawable,
    syncedAtMs,
    nowMs,
  });

  const progress = calculateStreamProgress(
    stream.startTime,
    stream.endTime,
    nowSec,
    stream.cancelled,
    stream.cancelledAt
  );

  const status = deriveStreamStatus(stream, nowSec);

  return {
    withdrawable,
    progress,
    status,
    nowMs,
  };
}
