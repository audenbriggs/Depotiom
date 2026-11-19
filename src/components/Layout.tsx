import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertCircle, Menu, X } from 'lucide-react';
import {
  WALLET_NOTICE_EVENT,
  clearPendingWalletNotice,
  getPendingWalletNotice,
} from '../config/walletErrorGuard';
import { Logo } from './Logo';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Start Stream', to: '/start' },
  { label: 'My Streams', to: '/streams' },
  { label: 'Withdraw', to: '/withdraw' },
];

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletNotice, setWalletNotice] = useState<string | null>(() => getPendingWalletNotice());

  useEffect(() => {
    const existing = getPendingWalletNotice();
    if (existing) {
      setWalletNotice(existing);
    }
    const handleNotice = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (custom.detail) {
        setWalletNotice(custom.detail);
      }
    };
    window.addEventListener(WALLET_NOTICE_EVENT, handleNotice);
    return () => window.removeEventListener(WALLET_NOTICE_EVENT, handleNotice);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0E0E10] text-[#FFF9EE]">
      {/* Top Bar Contract: 3 zones (Brand - Nav Links - Connect Action) */}
      <header className="sticky top-0 z-40 border-b border-[#3A3A40] bg-[#0E0E10]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-8 lg:px-12">
          {/* Zone 1: Brand mark & wordmark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[#FFF9EE] whitespace-nowrap shrink-0"
          >
            <Logo size={30} />
            <span>Depotiom</span>
          </Link>

          {/* Zone 2: Primary navigation */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#FFF9EE] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#FF8A3D]'
                      : 'text-[#FFF9EE]/65 hover:text-[#FFF9EE]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Wallet connect CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const connected = mounted && account && chain;
                if (!mounted) {
                  return (
                    <div
                      aria-hidden="true"
                      className="h-10 w-32 rounded-[10px] border border-[#3A3A40] bg-[#141417]"
                    />
                  );
                }

                if (!connected) {
                  return (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#FF8A3D] px-4 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A3D] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#FF8A3D] px-4 text-sm font-semibold text-[#0E0E10] transition hover:brightness-110 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Switch to Arc
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="hidden sm:inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#3A3A40] bg-[#141417] px-3 text-xs font-medium text-[#FFF9EE] transition hover:border-[#FFF9EE] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Arc</span>
                    </button>
                    <button
                      type="button"
                      onClick={openAccountModal}
                      className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#3A3A40] bg-[#141417] px-3.5 text-xs font-mono-tabular font-medium text-[#FFF9EE] transition hover:border-[#FF8A3D] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{account.displayName}</span>
                    </button>
                  </div>
                );
              }}
            </ConnectButton.Custom>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#3A3A40] bg-[#141417] text-[#FFF9EE] md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-[#3A3A40] bg-[#141417] px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#FF8A3D] text-[#0E0E10] font-semibold'
                        : 'text-[#FFF9EE]/80 hover:bg-[#1B1B20] hover:text-[#FFF9EE]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        {walletNotice ? (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-[10px] border border-[#FF8A3D]/60 bg-[#141417] p-4 text-sm text-[#FFF9EE]"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF8A3D]" />
              <p className="leading-relaxed text-[#FFF9EE]/90">{walletNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearPendingWalletNotice();
                setWalletNotice(null);
              }}
              className="text-xs font-medium text-[#FFF9EE]/65 hover:text-[#FFF9EE] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {children}
      </main>

      {/* Footer on every page */}
      <footer className="border-t border-[#3A3A40] bg-[#1B1B20] text-[#FFF9EE]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#FFF9EE]">Built by Auden</p>
            <p className="text-xs text-[#FFF9EE]/75">
              Depotiom is an independent project, available on Arc.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#FFF9EE]/70">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-[#FFF9EE] whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
