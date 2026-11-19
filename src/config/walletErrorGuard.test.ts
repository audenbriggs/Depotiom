import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmptyWalletAccountError } from './walletErrorGuard';

test('isEmptyWalletAccountError detects raw EIP-1193 4001 empty account objects and wrapped causes', () => {
  assert.equal(
    isEmptyWalletAccountError({ code: 4001, message: 'wallet must has at least one account' }),
    true
  );
  assert.equal(
    isEmptyWalletAccountError(new Error('Wallet must have at least one account')),
    true
  );
  assert.equal(
    isEmptyWalletAccountError({
      name: 'UserRejectedRequestError',
      cause: { code: 4001, message: 'wallet must has at least one account' },
    }),
    true
  );
  assert.equal(
    isEmptyWalletAccountError({ code: 4001, message: 'User rejected the request.' }),
    false
  );
  assert.equal(isEmptyWalletAccountError(null), false);
});
