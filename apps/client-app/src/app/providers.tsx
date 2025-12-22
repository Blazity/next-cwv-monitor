'use client';

import { CWVMonitor } from 'cwv-monitor-sdk/app-router';
import { env } from '../env';

interface Props {
  children: React.ReactNode;
}

export const Providers: React.FC<Props> = ({ children }) => {
  return (
    <CWVMonitor projectId={env.NEXT_PUBLIC_MONITOR_PROJECT_ID} endpoint={env.NEXT_PUBLIC_MONITOR_API}>
      {children}
    </CWVMonitor>
  );
};
