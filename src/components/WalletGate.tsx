import type { ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Wallet, ArrowRightLeft } from 'lucide-react';
import { ARC_CHAIN_ID } from '../config/chain';

interface WalletGateProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function WalletGate({ title, description, children }: WalletGateProps) {
  const { isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return (
      <section className="mx-auto max-w-xl py-12">
        <div className="rounded-[10px] border border-[#3A3A40] bg-[#141417] p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#3A3A40] bg-[#1B1B20] text-[#FF8A3D]">
            <Wallet className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FFF9EE]">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#FFF9EE]/70">{description}</p>
          <div className="mt-7">
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#FF8A3D] px-6 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A3D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {chainId !== ARC_CHAIN_ID ? (
        <div className="mb-6 flex flex-col gap-3 rounded-[10px] border border-[#FF8A3D]/60 bg-[#141417] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-[#FFF9EE]">Switch network to Arc</p>
            <p className="text-xs text-[#FFF9EE]/70">
              Your wallet is connected to another network. Switch to Arc before sending transactions.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#FF8A3D] px-4 text-xs font-semibold text-[#0E0E10] transition hover:brightness-110 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {isPending ? 'Switching...' : 'Switch to Arc'}
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
