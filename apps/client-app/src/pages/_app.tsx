import type { AppProps } from 'next/app';
import { CWVMonitor } from '@next-cwv-monitor/cwv-monitor-sdk/pages-router';
import { env } from '../env';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CWVMonitor projectId={env.NEXT_PUBLIC_MONITOR_PROJECT_ID} endpoint={env.NEXT_PUBLIC_MONITOR_API}>
      <Component {...pageProps} />
    </CWVMonitor>
  );
}

