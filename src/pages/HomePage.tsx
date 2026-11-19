import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { SUPPORTED_TOKENS, isContractConfigured } from '../config/chain';
import { usePlatformStats } from '../hooks/useDepotiomContract';
import { useTokenMeta } from '../hooks/useTokenMeta';
import { formatTokenAmount } from '../utils/streamMath';
import { HomeStreamIllustration } from '../components/HomeStreamIllustration';

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1',
    title: 'Core streams live',
    status: 'Live',
    description:
      'Deposit USDC or EURC for a chosen duration, stream every second, withdraw accrued pay anytime, and top up or cancel from the sender wallet.',
  },
  {
    phase: 'Phase 2',
    title: 'Pause and resume',
    status: 'Next',
    description:
      'Temporarily pause active streams during breaks or scope reviews and resume the remaining schedule without creating a new contract agreement.',
  },
  {
    phase: 'Phase 3',
    title: 'Team stream templates',
    status: 'Planned',
    description:
      'Save recurring contributor durations, token defaults, and batch payouts so teams can launch monthly streams in one flow.',
  },
  {
    phase: 'Phase 4',
    title: 'Streams with cliffs and vesting',
    status: 'Planned',
    description:
      'Add optional cliff timestamps before linear accrual begins for longer engagements and contributor token schedules.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can a stream be cancelled',
    answer:
      'Yes. The sender who created the stream can cancel it at any point while funds remain unstreamed. Recipients cannot cancel a stream, though they can always withdraw what has already accrued.',
  },
  {
    question: 'What does the worker get if it is cancelled',
    answer:
      'When a stream is cancelled, the contract settles everything accrued up to that exact block timestamp directly to the recipient, and returns the remaining unstreamed balance to the sender.',
  },
  {
    question: 'Can I withdraw mid stream',
    answer:
      'Yes. Recipients can withdraw their accrued balance at any moment without waiting for the stream duration to finish and without needing approval from the sender.',
  },
  {
    question: 'Does the rate ever change',
    answer:
      'No. For the funded duration, the per-second rate remains fixed from the start timestamp until the end timestamp. Adding a top up increases the remaining funded runway according to the contract rules.',
  },
];

export function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const usdcMeta = useTokenMeta(SUPPORTED_TOKENS[0].address);
  const eurcMeta = useTokenMeta(SUPPORTED_TOKENS[1].address);

  const showRealStats = isContractConfigured && stats !== null && stats !== undefined;

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col justify-center space-y-6 lg:col-span-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">
            Built on Arc
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-[#FFF9EE] sm:text-5xl lg:text-[3.5rem] [text-wrap:balance]">
            Pay flows by the second
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[#FFF9EE]/75 sm:text-lg">
            Deposit USDC or EURC once over a chosen duration. Recipients withdraw what they have
            earned at any time, and senders can top up or cancel cleanly on Arc.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/start"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#FF8A3D] px-6 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A3D] whitespace-nowrap shrink-0"
            >
              <span>Start a stream</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/streams"
              className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#3A3A40] bg-transparent px-6 text-sm font-medium text-[#FFF9EE] transition hover:border-[#FFF9EE] hover:bg-[#1B1B20] whitespace-nowrap shrink-0"
            >
              My streams
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <HomeStreamIllustration />
        </div>
      </section>

      {/* Platform Stats Strip (Real Contract Reads Only) */}
      <section aria-labelledby="platform-stats-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="platform-stats-heading" className="text-xl font-semibold tracking-tight text-[#FFF9EE]">
            Protocol ledger
          </h2>
          <p className="text-xs text-[#FFF9EE]/60">
            {isContractConfigured
              ? statsLoading
                ? 'Reading contract state from Arc...'
                : 'Live figures read directly from the deployed contract on Arc'
              : 'Waiting for deployed contract address configuration'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
              Total streams
            </p>
            <p className="mt-3 font-mono-tabular text-2xl font-semibold text-[#FFF9EE]">
              {showRealStats ? stats.totalStreams.toLocaleString() : '—'}
            </p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
              Active streams
            </p>
            <p className="mt-3 font-mono-tabular text-2xl font-semibold text-[#FFE45E]">
              {showRealStats ? stats.activeStreams.toLocaleString() : '—'}
            </p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
              Total USDC streamed
            </p>
            <p className="mt-3 font-mono-tabular text-2xl font-semibold text-[#FFF9EE]">
              {showRealStats ? formatTokenAmount(stats.usdcVolume, usdcMeta.decimals, 2) : '—'}
            </p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
              Total EURC streamed
            </p>
            <p className="mt-3 font-mono-tabular text-2xl font-semibold text-[#FFF9EE]">
              {showRealStats ? formatTokenAmount(stats.eurcVolume, eurcMeta.decimals, 2) : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section aria-labelledby="about-heading" className="space-y-8 border-t border-[#3A3A40] pt-14">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">About</p>
          <h2 id="about-heading" className="text-2xl font-semibold tracking-tight text-[#FFF9EE] sm:text-3xl">
            How pay streams work
          </h2>
          <p className="text-base leading-relaxed text-[#FFF9EE]/75">
            Instead of waiting weeks for manual invoices or end-of-month payroll batches, streaming
            pay releases earnings continuously second by second for the exact period agreed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 space-y-2.5">
            <h3 className="text-base font-semibold text-[#FFF9EE]">
              01 Continuous settlement
            </h3>
            <p className="text-sm leading-relaxed text-[#FFF9EE]/70">
              A sender approves and deposits the total USDC or EURC amount once. The contract divides
              that deposit evenly across the chosen duration and accrues value every second.
            </p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 space-y-2.5">
            <h3 className="text-base font-semibold text-[#FFF9EE]">
              02 Built for freelancers
            </h3>
            <p className="text-sm leading-relaxed text-[#FFF9EE]/70">
              Contractors and independent contributors see earnings accrue in real time and can
              withdraw what is already owed whenever they need liquidity, without chasing payouts.
            </p>
          </div>
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 space-y-2.5">
            <h3 className="text-base font-semibold text-[#FFF9EE]">
              03 Transparent team control
            </h3>
            <p className="text-sm leading-relaxed text-[#FFF9EE]/70">
              Senders retain clear control to top up ongoing work or cancel if an engagement ends
              early, automatically paying the worker up to the exact second of cancellation.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section aria-labelledby="roadmap-heading" className="space-y-8 border-t border-[#3A3A40] pt-14">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">Roadmap</p>
          <h2 id="roadmap-heading" className="text-2xl font-semibold tracking-tight text-[#FFF9EE] sm:text-3xl">
            What comes next
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ROADMAP_PHASES.map((item) => (
            <div
              key={item.phase}
              className="flex flex-col justify-between rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-mono-tabular text-xs font-medium">
                  <span className="text-[#FFF9EE]/60">{item.phase}</span>
                  <span aria-hidden="true" className="text-[#FFF9EE]/40">
                    ·
                  </span>
                  <span
                    className={
                      item.status === 'Live'
                        ? 'text-[#FFE45E]'
                        : item.status === 'Next'
                          ? 'text-[#FF8A3D]'
                          : 'text-[#FFF9EE]/65'
                    }
                  >
                    {item.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#FFF9EE]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#FFF9EE]/70">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading" className="space-y-8 border-t border-[#3A3A40] pt-14 pb-4">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">FAQ</p>
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-[#FFF9EE] sm:text-3xl">
            Common questions
          </h2>
        </div>

        <div className="divide-y divide-[#3A3A40] rounded-[10px] border border-[#3A3A40] bg-[#141417]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#1B1B20] cursor-pointer"
                >
                  <span className="text-base font-medium text-[#FFF9EE]">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#FFF9EE]/60 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-[#FF8A3D]' : ''
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-[#FFF9EE]/75">
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
