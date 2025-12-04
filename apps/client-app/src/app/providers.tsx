'use client';

import { CWVMonitor } from 'cwv-monitor-sdk';
import { env } from '../env';

interface Props {
  children: React.ReactNode;
}

export const Providers: React.FC<Props> = ({ children }) => {
  return (
    <>
      <CWVMonitor apiKey={env.NEXT_PUBLIC_MONITOR_API_KEY} endpoint={env.NEXT_PUBLIC_MONITOR_API} />
      {children}
    </>
  );
};
