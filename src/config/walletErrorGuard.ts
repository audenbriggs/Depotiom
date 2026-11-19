export const WALLET_NOTICE_EVENT = 'depotiom:wallet-notice';

export const EMPTY_WALLET_NOTICE_MESSAGE =
  'Your browser wallet has no unlocked account. Unlock or create an account in your wallet extension, then try connecting again.';

let pendingNotice: string | null = null;

export function isEmptyWalletAccountError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; message?: unknown; cause?: unknown; details?: unknown };
  const message = [
    typeof record.message === 'string' ? record.message : '',
    typeof record.details === 'string' ? record.details : '',
  ].join(' ');

  if (/wallet must has at least one account|must have at least one account/i.test(message)) {
    return true;
  }

  if (record.cause && isEmptyWalletAccountError(record.cause)) {
    return true;
  }

  return false;
}

export function getPendingWalletNotice(): string | null {
  return pendingNotice;
}

export function clearPendingWalletNotice(): void {
  pendingNotice = null;
}

export function emitWalletNotice(message: string): void {
  pendingNotice = message;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(WALLET_NOTICE_EVENT, { detail: message }));
}

let guardInstalled = false;

export function installWalletUnhandledRejectionGuard(): void {
  if (typeof window === 'undefined' || guardInstalled) return;
  guardInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (isEmptyWalletAccountError(event.reason)) {
      event.preventDefault();
      emitWalletNotice(EMPTY_WALLET_NOTICE_MESSAGE);
    }
  });
}
