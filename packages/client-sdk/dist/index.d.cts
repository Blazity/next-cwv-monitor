interface Props$1 {
    children: React.ReactNode;
    endpoint: string;
    apiKey: string;
    abortTime?: number;
}
declare const ConfigProvider: React.FC<Props$1>;

type Props = Omit<React.ComponentProps<typeof ConfigProvider>, 'children'>;
declare const CWVMonitor: React.FC<Props>;

export { CWVMonitor };
