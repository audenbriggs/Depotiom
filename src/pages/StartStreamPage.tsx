import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import { isAddress, parseUnits, type Address } from 'viem';
import {
  ARC_CHAIN_ID,
  CONTRACT_ADDRESS,
  SUPPORTED_TOKENS,
  isContractConfigured,
} from '../config/chain';
import { erc20Abi } from '../abi/erc20';
import { useContractAbi } from '../hooks/useContractAbi';
import { useTokenMeta } from '../hooks/useTokenMeta';
import { useTxLifecycle } from '../hooks/useTxLifecycle';
import {
  computeRatePerSecond,
  formatDurationHuman,
  formatTokenAmount,
  parseDurationToSeconds,
  type DurationUnit,
} from '../utils/streamMath';
import { WalletGate } from '../components/WalletGate';
import { TxStatusPanel } from '../components/TxStatusPanel';
import { DecimalBalance } from '../components/DecimalBalance';

const DURATION_PRESETS: { label: string; value: string; unit: DurationUnit }[] = [
  { label: '1 hour', value: '1', unit: 'hours' },
  { label: '1 day', value: '1', unit: 'days' },
  { label: '7 days', value: '7', unit: 'days' },
  { label: '30 days', value: '30', unit: 'days' },
];

export function StartStreamPage() {
  return (
    <WalletGate
      title="Connect your wallet to start a stream"
      description="Connect a wallet on Arc to check your USDC or EURC balance, approve the contract allowance, and fund a new pay stream."
    >
      <StartStreamForm />
    </WalletGate>
  );
}

function StartStreamForm() {
  const { address } = useAccount();
  const { abi, functions } = useContractAbi();
  const { writeContractAsync } = useWriteContract();
  const { txState, execute, reset, isBusy } = useTxLifecycle();

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>(
    SUPPORTED_TOKENS[0].address
  );
  const [recipient, setRecipient] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [durationValue, setDurationValue] = useState('30');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days');
  const [createdSuccess, setCreatedSuccess] = useState(false);

  const tokenMeta = useTokenMeta(selectedTokenAddress);
  const usdcMeta = useTokenMeta(SUPPORTED_TOKENS[0].address);
  const eurcMeta = useTokenMeta(SUPPORTED_TOKENS[1].address);

  let parsedAmount = 0n;
  let amountError = '';
  if (amountInput.trim() !== '') {
    try {
      parsedAmount = parseUnits(amountInput.trim(), tokenMeta.decimals);
      if (parsedAmount <= 0n) {
        amountError = 'Enter an amount greater than 0.';
      } else if (parsedAmount > tokenMeta.balance) {
        amountError = `Insufficient ${tokenMeta.symbol} balance in connected wallet.`;
      }
    } catch {
      amountError = 'Enter a valid numeric amount.';
    }
  }

  const trimmedRecipient = recipient.trim();
  let recipientError = '';
  if (trimmedRecipient !== '') {
    if (!isAddress(trimmedRecipient)) {
      recipientError = 'Enter a valid Arc wallet address (0x...).';
    } else if (address && trimmedRecipient.toLowerCase() === address.toLowerCase()) {
      recipientError = 'Recipient address cannot match the sender wallet.';
    }
  }

  const numericDuration = Number(durationValue);
  const durationSeconds = parseDurationToSeconds(numericDuration, durationUnit);
  const durationError =
    durationValue.trim() !== '' && durationSeconds <= 0
      ? 'Duration must be greater than 0 seconds.'
      : '';

  const needsApproval =
    isContractConfigured && parsedAmount > 0n && tokenMeta.allowance < parsedAmount;

  const ratePerSecond = computeRatePerSecond(parsedAmount, durationSeconds);
  const ratePerHour = ratePerSecond * 3600n;
  const ratePerDay = ratePerSecond * 86400n;

  const canSubmit =
    isContractConfigured &&
    !isBusy &&
    isAddress(trimmedRecipient) &&
    (!address || trimmedRecipient.toLowerCase() !== address.toLowerCase()) &&
    parsedAmount > 0n &&
    parsedAmount <= tokenMeta.balance &&
    durationSeconds > 0;

  const handleSetMax = () => {
    const raw = Number(tokenMeta.balance) / 10 ** tokenMeta.decimals;
    // Use exact bigint formatting without floating-point rounding
    const str = (
      Number(tokenMeta.balance / BigInt(10 ** tokenMeta.decimals)) +
      0
    ).toString();
    void raw;
    void str;
    const divisor = 10n ** BigInt(tokenMeta.decimals);
    const whole = tokenMeta.balance / divisor;
    const frac = tokenMeta.balance % divisor;
    const fracStr = frac.toString().padStart(tokenMeta.decimals, '0').replace(/0+$/, '');
    setAmountInput(fracStr ? `${whole}.${fracStr}` : `${whole}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const contractAddress = CONTRACT_ADDRESS;
    if (!canSubmit || !contractAddress) return;
    setCreatedSuccess(false);

    if (needsApproval) {
      const hash = await execute(`Approve ${tokenMeta.symbol}`, () =>
        writeContractAsync({
          address: selectedTokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, parsedAmount],
          chainId: ARC_CHAIN_ID,
        })
      );
      if (hash) {
        await tokenMeta.refetch();
      }
      return;
    }

    const fnName = functions.createStream?.name ?? 'createStream';
    const hash = await execute('Create pay stream', () =>
      writeContractAsync({
        address: contractAddress,
        abi,
        functionName: fnName,
        args: [trimmedRecipient as Address, selectedTokenAddress, parsedAmount, BigInt(durationSeconds)],
        chainId: ARC_CHAIN_ID,
      })
    );

    if (hash) {
      setCreatedSuccess(true);
      await tokenMeta.refetch();
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-[#FF8A3D]">Create</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#FFF9EE] sm:text-4xl">
          Start a stream
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#FFF9EE]/70">
          Approve your token allowance and deposit a fixed amount that flows linearly to the
          recipient every second over your selected duration.
        </p>
      </div>

      {!isContractConfigured ? (
        <div className="rounded-[10px] border border-[#FF8A3D]/60 bg-[#141417] p-5 text-sm text-[#FFF9EE]">
          <p className="font-semibold">Contract address not configured</p>
          <p className="mt-1 text-xs text-[#FFF9EE]/70">
            Set <code className="font-mono-tabular text-[#FFE45E]">VITE_CONTRACT_ADDRESS</code> in
            your environment to enable on-chain stream creation on Arc.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Column */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[10px] border border-[#3A3A40] bg-[#141417] p-6 sm:p-8 lg:col-span-7"
        >
          {/* Token Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/70">
              Stream token
            </span>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_TOKENS.map((t) => {
                const isSelected = selectedTokenAddress.toLowerCase() === t.address.toLowerCase();
                const meta = t.symbol === 'USDC' ? usdcMeta : eurcMeta;
                return (
                  <button
                    key={t.address}
                    type="button"
                    onClick={() => {
                      setSelectedTokenAddress(t.address);
                      reset();
                    }}
                    className={`flex flex-col items-start rounded-[10px] border p-4 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#FF8A3D] bg-[#1B1B20]'
                        : 'border-[#3A3A40] bg-[#0E0E10] hover:border-[#FFF9EE]/50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-[#FFF9EE]">{t.symbol}</span>
                      <span className="text-xs text-[#FFF9EE]/60">{t.name}</span>
                    </div>
                    <p className="mt-2 font-mono-tabular text-xs text-[#FFE45E]">
                      Balance: {formatTokenAmount(meta.balance, meta.decimals, 2)} {meta.symbol}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Input */}
          <div className="space-y-2">
            <label
              htmlFor="recipient-address"
              className="block text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/70"
            >
              Recipient wallet address
            </label>
            <input
              id="recipient-address"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] px-4 py-3 font-mono-tabular text-sm text-[#FFF9EE] placeholder:text-[#FFF9EE]/35 focus:border-[#FF8A3D] focus:outline-none"
            />
            {recipientError ? <p className="text-xs text-[#FFB4AB]">{recipientError}</p> : null}
          </div>

          {/* Total Deposit Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="total-amount"
                className="block text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/70"
              >
                Total stream amount
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-xs font-medium text-[#FF8A3D] hover:underline cursor-pointer"
              >
                Max ({formatTokenAmount(tokenMeta.balance, tokenMeta.decimals, 2)} {tokenMeta.symbol})
              </button>
            </div>
            <div className="flex items-center overflow-hidden rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] focus-within:border-[#FF8A3D]">
              <input
                id="total-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent px-4 py-3 font-mono-tabular text-base text-[#FFF9EE] placeholder:text-[#FFF9EE]/35 focus:outline-none"
              />
              <span className="border-l border-[#3A3A40] px-4 py-3 text-xs font-semibold tracking-wider text-[#FFF9EE]/80">
                {tokenMeta.symbol}
              </span>
            </div>
            {amountError ? <p className="text-xs text-[#FFB4AB]">{amountError}</p> : null}
          </div>

          {/* Duration Input */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="duration-value"
                className="block text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/70"
              >
                Stream duration
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setDurationValue(preset.value);
                      setDurationUnit(preset.unit);
                    }}
                    className="rounded-md border border-[#3A3A40] bg-[#1B1B20] px-2.5 py-1 text-xs font-medium text-[#FFF9EE]/80 transition hover:border-[#FF8A3D] hover:text-[#FFF9EE] cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                id="duration-value"
                type="number"
                min="1"
                step="1"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="w-full rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] px-4 py-3 font-mono-tabular text-sm text-[#FFF9EE] focus:border-[#FF8A3D] focus:outline-none"
              />
              <select
                aria-label="Duration unit"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="w-full rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] px-4 py-3 text-sm text-[#FFF9EE] focus:border-[#FF8A3D] focus:outline-none"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months (30 days)</option>
              </select>
            </div>
            {durationError ? <p className="text-xs text-[#FFB4AB]">{durationError}</p> : null}
          </div>

          <TxStatusPanel txState={txState} onDismiss={reset} />

          {createdSuccess ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FFE45E]/60 bg-[#1B1B20] p-4 text-sm">
              <span className="text-[#FFF9EE]">Stream created on Arc.</span>
              <Link
                to="/streams"
                className="font-semibold text-[#FF8A3D] hover:underline"
              >
                View in My Streams
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[#FF8A3D] px-6 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
          >
            {isBusy
              ? txState.stage === 'confirming'
                ? 'Confirming on Arc...'
                : 'Check wallet...'
              : needsApproval
                ? `Approve ${tokenMeta.symbol}`
                : 'Start stream'}
          </button>
        </form>

        {/* Live Summary Column */}
        <aside className="space-y-6 lg:col-span-5">
          <div className="rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#FFF9EE]/60">
                Calculated stream rate
              </p>
              <div className="mt-3">
                <DecimalBalance
                  formatted={formatTokenAmount(ratePerSecond, tokenMeta.decimals, 6)}
                  symbol={`${tokenMeta.symbol} / sec`}
                  size="lg"
                  tone="lemon"
                  primaryDecimals={2}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-[#3A3A40] pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#FFF9EE]/65">Hourly flow</span>
                <span className="font-mono-tabular font-medium text-[#FFF9EE]">
                  {formatTokenAmount(ratePerHour, tokenMeta.decimals, 4)} {tokenMeta.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#FFF9EE]/65">Daily flow</span>
                <span className="font-mono-tabular font-medium text-[#FFF9EE]">
                  {formatTokenAmount(ratePerDay, tokenMeta.decimals, 2)} {tokenMeta.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#FFF9EE]/65">Total duration</span>
                <span className="font-mono-tabular font-medium text-[#FFF9EE]">
                  {durationSeconds > 0 ? formatDurationHuman(durationSeconds) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#FFF9EE]/65">On-chain decimals</span>
                <span className="font-mono-tabular font-medium text-[#FFF9EE]">
                  {tokenMeta.decimals}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#FFF9EE]/65">Current allowance</span>
                <span className="font-mono-tabular font-medium text-[#FFF9EE]">
                  {formatTokenAmount(tokenMeta.allowance, tokenMeta.decimals, 2)} {tokenMeta.symbol}
                </span>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#3A3A40] bg-[#0E0E10] p-4 text-xs leading-relaxed text-[#FFF9EE]/70">
              {needsApproval
                ? `Step 1 approves ${tokenMeta.symbol} spending for the Depotiom contract. Step 2 deposits the funds and starts the stream immediately.`
                : 'Your allowance covers this deposit. Submitting starts the stream at the confirmation block timestamp.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
