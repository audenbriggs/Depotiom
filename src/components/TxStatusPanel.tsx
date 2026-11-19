import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { TxState } from '../hooks/useTxLifecycle';
import { getTxExplorerUrl } from '../config/chain';

interface TxStatusPanelProps {
  txState: TxState;
  onDismiss?: () => void;
}

export function TxStatusPanel({ txState, onDismiss }: TxStatusPanelProps) {
  if (txState.stage === 'idle') return null;

  const isPending = txState.stage === 'pending';
  const isConfirming = txState.stage === 'confirming';
  const isConfirmed = txState.stage === 'confirmed';
  const isError = txState.stage === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-[10px] border p-4 text-sm ${
        isError
          ? 'border-[#FFB4AB]/60 bg-[#FFB4AB]/10 text-[#FFF9EE]'
          : isConfirmed
            ? 'border-[#FFE45E]/60 bg-[#FFE45E]/10 text-[#FFF9EE]'
            : 'border-[#FF8A3D]/60 bg-[#FF8A3D]/10 text-[#FFF9EE]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isPending || isConfirming ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#FF8A3D]" />
          ) : isConfirmed ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFE45E]" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB4AB]" />
          )}
          <div className="space-y-1">
            <p className="font-medium text-[#FFF9EE]">
              {isPending && `${txState.label}: Confirm in your wallet`}
              {isConfirming && `${txState.label}: Confirming on Arc`}
              {isConfirmed && `${txState.label}: Confirmed on Arc`}
              {isError && `${txState.label}: Transaction failed`}
            </p>
            {txState.errorMessage ? (
              <p className="text-xs text-[#FFB4AB]">{txState.errorMessage}</p>
            ) : null}
            {txState.hash ? (
              <a
                href={getTxExplorerUrl(txState.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#FF8A3D] underline-offset-4 hover:underline"
              >
                View on ArcScan
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
        {onDismiss && (isConfirmed || isError) ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-[#FFF9EE]/70 hover:text-[#FFF9EE] whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
