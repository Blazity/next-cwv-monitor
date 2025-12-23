/* eslint-disable react-refresh/only-export-components */
import { CWVConfig, CWVProvider as CWVContextProvider } from './cwv-context';
import { useIngestQueueLifecycle } from './hooks/use-ingest-queue';
import { useMetrics } from './hooks/use-metrics';
import { AppRouterRouteTracker } from './next-route-tracker/app-router';

export { useTrackCustomEvent } from './hooks/use-track-custom-event';

const HookCaller = () => {
  useIngestQueueLifecycle();
  useMetrics();

  return <AppRouterRouteTracker />;
};

type CWVMonitorProps = CWVConfig & {
  children?: React.ReactNode;
};

export const CWVMonitor = ({ children, ...config }: CWVMonitorProps) => {
  return (
    <CWVContextProvider config={config}>
      <HookCaller />
      {children}
    </CWVContextProvider>
  );
};

export const CWVProvider = CWVMonitor;
