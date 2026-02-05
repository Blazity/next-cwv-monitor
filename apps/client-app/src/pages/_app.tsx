import type { AppProps } from 'next/app';
import { CWVMonitor } from 'next-cwv-monitor/pages-router';
import { env } from '../env';
import '../app/globals.css';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CWVMonitor projectId={env.NEXT_PUBLIC_MONITOR_PROJECT_ID} endpoint={env.NEXT_PUBLIC_MONITOR_API} useBeacon={!env.NEXT_PUBLIC_DISABLE_BEACON}>
      <Toaster position="top-center" richColors theme="dark" />
      <Component {...pageProps} />
    </CWVMonitor>
  );
}
