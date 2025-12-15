import { type FC, type ReactNode } from 'react';
import { ConfigContext } from './config.context';

type Props = ConfigContext & { children: ReactNode };

export const ConfigProvider: FC<Props> = ({ children, ...config }) => {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};
