import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DecimalBalance } from './DecimalBalance';
import { StreamProgressBar } from './StreamProgressBar';

/**
 * Strictly marked layout illustration demonstrating continuous per-second accrual.
 * Does not claim to represent live user funds or protocol telemetry.
 */
export function HomeStreamIllustration() {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      const diff = (performance.now() - startedAt) / 1000;
      setElapsedSec(diff % 60);
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  // Illustrative constant curve strictly for UI layout preview
  const ratePerSecond = 0.001157;
  const accrued = elapsedSec * ratePerSecond;
  const progress = Math.min(100, (elapsedSec / 60) * 100);
  const formatted = accrued.toFixed(6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col justify-between rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 sm:p-8"
      aria-label="Stream mechanics layout illustration"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#3A3A40] pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
            Layout illustration · Preview
          </p>
          <p className="mt-1 text-sm font-medium text-[#FFF9EE]">
            Continuous per-second flow curve
          </p>
        </div>
      </div>

      <div className="my-6 space-y-5 sm:my-8 sm:space-y-6">
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#FFF9EE]/60">
            <span>Illustrative accrued counter</span>
            <span className="font-mono-tabular text-[#FFE45E] whitespace-nowrap">
              +{ratePerSecond.toFixed(6)} / sec
            </span>
          </div>
          <div className="mt-3">
            <DecimalBalance formatted={formatted} symbol="TOKEN" size="xl" tone="lemon" primaryDecimals={2} />
          </div>
          <div className="mt-5 space-y-2">
            <StreamProgressBar progress={progress} active={true} />
            <div className="flex items-center justify-between text-xs text-[#FFF9EE]/60 font-mono-tabular">
              <span>Start</span>
              <span>{Math.round(progress)}% cycle</span>
              <span>End</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-3">
            <p className="text-[#FFF9EE]/60">Step 1</p>
            <p className="mt-1 font-medium text-[#FFF9EE]">Sender locks total</p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-3">
            <p className="text-[#FFF9EE]/60">Step 2</p>
            <p className="mt-1 font-medium text-[#FFF9EE]">Balance ticks live</p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-3">
            <p className="text-[#FFF9EE]/60">Step 3</p>
            <p className="mt-1 font-medium text-[#FFF9EE]">Withdraw anytime</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#FFF9EE]/60">
        Visual demonstration of linear stream pacing. Real stream balances load only from your connected wallet and Arc contract reads.
      </p>
    </motion.div>
  );
}
