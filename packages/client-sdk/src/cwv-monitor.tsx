import { ConfigProvider } from './context/config/config.provider.js';
import { useMetrics } from './hooks/use-metrics.js';

type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface Props extends Omit<React.ComponentProps<typeof ConfigProvider>, 'children'> {
  sampleRate: `0.${Digit}` | '1.0';
  debug?: boolean;
  customDimensions?: unknown;
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
