import { createContext, use } from 'react';
import { invariant } from '../../utils/invariant.js';
import type { Fetcher } from '../../utils/fetcher.js';

export interface ConfigContext {
  fetcher: Fetcher;
}

export const ConfigContext = createContext<ConfigContext | undefined>(undefined);

export const useConfig = () => {
  const context = use(ConfigContext);
  invariant(context, 'To use config, you have to use ConfigContext.Provider');
  return context;
};
