import { splitDecimalParts } from '../utils/streamMath';

interface DecimalBalanceProps {
  formatted: string;
  symbol?: string;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  tone?: 'lemon' | 'warm-white';
  primaryDecimals?: number;
}

export function DecimalBalance({
  formatted,
  symbol,
  size = 'lg',
  tone = 'lemon',
  primaryDecimals = 2,
}: DecimalBalanceProps) {
  const { primary, tail } = splitDecimalParts(formatted, primaryDecimals);

  const primaryClass =
    size === 'xl'
      ? 'text-3xl sm:text-5xl font-bold tracking-tight'
      : size === 'lg'
        ? 'text-2xl sm:text-3xl font-bold tracking-tight'
        : size === 'md'
          ? 'text-lg sm:text-xl font-semibold tracking-tight'
          : 'text-sm font-medium';

  const tailClass =
    size === 'xl'
      ? 'text-xl sm:text-3xl font-semibold'
      : size === 'lg'
        ? 'text-base sm:text-xl font-semibold'
        : size === 'md'
          ? 'text-sm sm:text-base font-medium'
          : 'text-xs font-normal';

  const colorClass = tone === 'lemon' ? 'text-[#FFE45E]' : 'text-[#FFF9EE]';

  return (
    <span className={`font-mono-tabular inline-flex items-baseline ${colorClass}`}>
      <span className={primaryClass}>{primary}</span>
      {tail ? <span className={`${tailClass} opacity-70`}>{tail}</span> : null}
      {symbol ? (
        <span className="ml-2 text-xs font-sans font-medium uppercase tracking-wider text-[#FFF9EE]/70">
          {symbol}
        </span>
      ) : null}
    </span>
  );
}
