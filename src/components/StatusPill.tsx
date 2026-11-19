import type { StreamStatus } from '../utils/streamMath';

interface StatusPillProps {
  status: StreamStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  if (status === 'Streaming') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE45E] bg-[#FFE45E]/10 px-2.5 py-0.5 text-xs font-medium text-[#FFE45E] whitespace-nowrap shrink-0">
        <span className="stream-dot-glow h-1.5 w-1.5 rounded-full bg-[#FFE45E] animate-pulse" aria-hidden="true" />
        Streaming
      </span>
    );
  }

  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center rounded-full border border-[#3A3A40] bg-[#1B1B20] px-2.5 py-0.5 text-xs font-medium text-[#FFF9EE] whitespace-nowrap shrink-0">
        Completed
      </span>
    );
  }

  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center rounded-full border border-[#FFB4AB]/50 bg-[#FFB4AB]/10 px-2.5 py-0.5 text-xs font-medium text-[#FFB4AB] whitespace-nowrap shrink-0">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-[#3A3A40] bg-[#3A3A40]/30 px-2.5 py-0.5 text-xs font-medium text-[#FFF9EE]/75 whitespace-nowrap shrink-0">
      Scheduled
    </span>
  );
}
