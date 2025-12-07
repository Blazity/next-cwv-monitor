import { ConfigProvider } from './context/config/config.provider.js';
import { useMetrics } from './hooks/use-metrics.js';

interface Props extends Omit<React.ComponentProps<typeof ConfigProvider>, 'children'> {
  debug?: boolean;
}

const HookCaller: React.FC = () => {
  useMetrics();

  return null;
};

export const CWVMonitor: React.FC<Props> = ({ ...props }) => {
  return (
    <ConfigProvider {...props}>
      <HookCaller />
    </ConfigProvider>
  );
};
