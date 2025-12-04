import { ConfigProvider } from './context/config/config.provider.js';
import { useCallAuthorized } from './hooks/use-call-authorized.js';

type Props = Omit<React.ComponentProps<typeof ConfigProvider>, 'children'>;

const HookCaller: React.FC = () => {
  useCallAuthorized();
  return null;
};

export const CWVMonitor: React.FC<Props> = ({ ...props }) => {
  console.log('TEST');
  return (
    <ConfigProvider {...props}>
      <HookCaller />
    </ConfigProvider>
  );
};
