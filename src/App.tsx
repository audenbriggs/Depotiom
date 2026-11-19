import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './config/wagmi';
import { arcChain } from './config/chain';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { StartStreamPage } from './pages/StartStreamPage';
import { MyStreamsPage } from './pages/MyStreamsPage';
import { StreamDetailPage } from './pages/StreamDetailPage';
import { WithdrawPage } from './pages/WithdrawPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const depotiomTheme = darkTheme({
  accentColor: '#FF8A3D',
  accentColorForeground: '#0E0E10',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={arcChain} theme={depotiomTheme}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/start" element={<StartStreamPage />} />
                <Route path="/streams" element={<MyStreamsPage />} />
                <Route path="/streams/:id" element={<StreamDetailPage />} />
                <Route path="/withdraw" element={<WithdrawPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
