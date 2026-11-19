import test from 'node:test';
import assert from 'node:assert/strict';
import type { Abi } from 'viem';
import {
  FALLBACK_DEPOTIOM_ABI,
  normalizePlatformStats,
  normalizeStreamResult,
  resolveAbiFunctions,
} from './normalize';

test('resolveAbiFunctions maps standard and alternate deployed ABI names', () => {
  const resolvedFallback = resolveAbiFunctions(FALLBACK_DEPOTIOM_ABI);
  assert.equal(resolvedFallback.createStream?.name, 'createStream');
  assert.equal(resolvedFallback.withdraw?.name, 'withdraw');
  assert.equal(resolvedFallback.topUp?.name, 'topUp');
  assert.equal(resolvedFallback.cancel?.name, 'cancel');
  assert.equal(resolvedFallback.getStream?.name, 'getStream');
  assert.equal(resolvedFallback.withdrawable?.name, 'withdrawable');

  const customAbi: Abi = [
    {
      type: 'function',
      name: 'startStream',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'withdrawableAmount',
      stateMutability: 'view',
      inputs: [{ name: 'id', type: 'uint256' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'getStreamsBySender',
      stateMutability: 'view',
      inputs: [{ name: 'sender', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }],
    },
  ];

  const resolvedCustom = resolveAbiFunctions(customAbi);
  assert.equal(resolvedCustom.createStream?.name, 'startStream');
  assert.equal(resolvedCustom.withdrawable?.name, 'withdrawableAmount');
  assert.equal(resolvedCustom.streamsBySender?.name, 'getStreamsBySender');
});

test('normalizeStreamResult handles both object structs and tuple arrays', () => {
  const fromObject = normalizeStreamResult(7n, {
    sender: '0x1111111111111111111111111111111111111111',
    recipient: '0x2222222222222222222222222222222222222222',
    token: '0x3600000000000000000000000000000000000000',
    totalAmount: 500_000_000n,
    withdrawnAmount: 100_000_000n,
    startTime: 1700000000n,
    endTime: 1700001000n,
    cancelled: false,
    cancelledAt: 0n,
  });

  assert.ok(fromObject);
  assert.equal(fromObject.id, 7n);
  assert.equal(fromObject.duration, 1000);
  assert.equal(fromObject.ratePerSecond, 500_000n);

  const fromTuple = normalizeStreamResult(8n, [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    1_000_000_000n,
    250_000_000n,
    1700000000n,
    1700002000n,
    true,
    1700000500n,
  ]);

  assert.ok(fromTuple);
  assert.equal(fromTuple.cancelled, true);
  assert.equal(fromTuple.cancelledAt, 1700000500);
});

test('normalizePlatformStats handles tuple and named outputs', () => {
  const stats = normalizePlatformStats([12n, 5n, 4500_000_000n, 1200_000_000n]);
  assert.deepEqual(stats, {
    totalStreams: 12n,
    activeStreams: 5n,
    usdcVolume: 4500_000_000n,
    eurcVolume: 1200_000_000n,
  });
});
