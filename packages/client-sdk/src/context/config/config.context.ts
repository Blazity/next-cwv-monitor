import { createContext, use } from 'react';
import { invariant } from '../../utils/invariant.js';
import type { Fetcher } from '../../utils/fetcher.js';

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ConfigContext {
  fetcher: Fetcher;
  sampleRate?: `0.${Digit}` | '1.0';
  customDimensions?: Record<string, unknown>;
}

export const ConfigContext = createContext<ConfigContext | undefined>(undefined);

export const useConfig = (): ConfigContext => {
  const context = use(ConfigContext);
  invariant(context, 'To use config, you have to use ConfigContext.Provider');
  return context;
};
