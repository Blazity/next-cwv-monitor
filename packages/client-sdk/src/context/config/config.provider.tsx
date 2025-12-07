import { useState } from 'react';
import { ConfigContext } from './config.context.js';
import { Fetcher } from '../../utils/fetcher.js';

interface Props {
  children: React.ReactNode;
  endpoint: string;
  apiKey: string;
  abortTime?: number;
}

export const ConfigProvider: React.FC<Props> = ({ children, apiKey, endpoint, abortTime }) => {
  const [fetcher] = useState(new Fetcher(endpoint, apiKey, abortTime));
  return <ConfigContext.Provider value={{ fetcher }}>{children}</ConfigContext.Provider>;
};
