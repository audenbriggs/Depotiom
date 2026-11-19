import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStreamProgress,
  computeClientWithdrawable,
  computeRatePerSecond,
  deriveStreamStatus,
  formatTokenAmount,
  parseDurationToSeconds,
  splitDecimalParts,
} from './streamMath';

test('parseDurationToSeconds converts units accurately', () => {
  assert.equal(parseDurationToSeconds(15, 'minutes'), 900);
  assert.equal(parseDurationToSeconds(2, 'hours'), 7200);
  assert.equal(parseDurationToSeconds(7, 'days'), 604800);
  assert.equal(parseDurationToSeconds(0, 'days'), 0);
  assert.equal(parseDurationToSeconds(-5, 'days'), 0);
});

test('computeClientWithdrawable ticks linearly and respects drift sync and caps', () => {
  const startTimeSec = 1_000_000;
  const duration = 1000;
  const endTimeSec = startTimeSec + duration;
  const totalAmount = 1_000_000_000n; // 1000 USDC (6 decimals)

  // Halfway through without prior sync -> 500 USDC
  const halfway = computeClientWithdrawable({
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount: 0n,
    cancelled: false,
    nowMs: (startTimeSec + 500) * 1000,
  });
  assert.equal(halfway, 500_000_000n);

  // Withdrawn 200 USDC -> 300 USDC withdrawable halfway through
  const afterWithdraw = computeClientWithdrawable({
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount: 200_000_000n,
    cancelled: false,
    nowMs: (startTimeSec + 500) * 1000,
  });
  assert.equal(afterWithdraw, 300_000_000n);

  // Re-synced with contract at t=500 with 300_000_000n, advancing 10s -> 310_000_000n
  const syncedForward = computeClientWithdrawable({
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount: 200_000_000n,
    ratePerSecondWei: computeRatePerSecond(totalAmount, duration),
    cancelled: false,
    syncedWithdrawable: 300_000_000n,
    syncedAtMs: (startTimeSec + 500) * 1000,
    nowMs: (startTimeSec + 510) * 1000,
  });
  assert.equal(syncedForward, 310_000_000n);

  // Cancelled stream stays frozen at synced contract reading
  const cancelledFrozen = computeClientWithdrawable({
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount: 200_000_000n,
    cancelled: true,
    cancelledAtSec: startTimeSec + 500,
    syncedWithdrawable: 300_000_000n,
    syncedAtMs: (startTimeSec + 500) * 1000,
    nowMs: (startTimeSec + 900) * 1000,
  });
  assert.equal(cancelledFrozen, 300_000_000n);

  // Past end time clamps to totalAmount - withdrawnAmount
  const pastEnd = computeClientWithdrawable({
    startTimeSec,
    endTimeSec,
    totalAmount,
    withdrawnAmount: 200_000_000n,
    cancelled: false,
    nowMs: (endTimeSec + 5000) * 1000,
  });
  assert.equal(pastEnd, 800_000_000n);
});

test('deriveStreamStatus and calculateStreamProgress handle lifecycle states', () => {
  const base = {
    startTime: 1000,
    endTime: 2000,
    totalAmount: 1000n,
    withdrawnAmount: 0n,
    cancelled: false,
  };

  assert.equal(deriveStreamStatus(base, 500), 'Scheduled');
  assert.equal(deriveStreamStatus(base, 1500), 'Streaming');
  assert.equal(deriveStreamStatus(base, 2000), 'Completed');
  assert.equal(deriveStreamStatus({ ...base, cancelled: true }, 1500), 'Cancelled');

  assert.equal(calculateStreamProgress(1000, 2000, 1500, false), 50);
  assert.equal(calculateStreamProgress(1000, 2000, 1800, true, 1250), 25);
});

test('formatTokenAmount and splitDecimalParts format tabular decimals cleanly', () => {
  const formatted = formatTokenAmount(1245_382194n, 6, 6);
  assert.equal(formatted, '1,245.382194');
  assert.deepEqual(splitDecimalParts(formatted, 2), {
    primary: '1,245.38',
    tail: '2194',
  });
});
