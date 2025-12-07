import { useState } from 'react';
import { ConfigContext } from './config.context';
import { Fetcher } from '../../utils/fetcher';

interface Props extends Omit<ConfigContext, 'fetcher'> {
  children: React.ReactNode;
  endpoint: string;
  apiKey: string;
  abortTime?: number;
}

export const ConfigProvider: React.FC<Props> = ({
  children,
  apiKey,
  endpoint,
  abortTime,
  sampleRate,
  customDimensions
}) => {
  const [fetcher] = useState(new Fetcher(endpoint, apiKey, abortTime));
  return <ConfigContext.Provider value={{ fetcher, sampleRate, customDimensions }}>{children}</ConfigContext.Provider>;
};
