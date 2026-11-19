interface StreamProgressBarProps {
  progress: number;
  active: boolean;
}

export function StreamProgressBar({ progress, active }: StreamProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="relative h-1 w-full rounded-full bg-[#3A3A40]"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="relative h-full rounded-full bg-[#FF8A3D] transition-[width] duration-150 ease-linear"
        style={{ width: `${clamped}%` }}
      >
        {active && clamped > 0 && clamped < 100 ? (
          <span
            aria-hidden="true"
            className="stream-dot-glow absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#FFE45E]"
          />
        ) : null}
      </div>
    </div>
  );
}
