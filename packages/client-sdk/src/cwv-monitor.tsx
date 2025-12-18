import { CWVConfig, CWVProvider as CWVContextProvider } from './cwv-context';
import { useMetrics } from './hooks/use-metrics';
import { useIngestQueueLifecycle } from './hooks/use-ingest-queue';
import { usePageViewTracking } from './hooks/use-page-view-tracking';

const HookCaller = () => {
  useIngestQueueLifecycle();
  usePageViewTracking();
  useMetrics();

  return null;
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
