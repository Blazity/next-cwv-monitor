import { createContext, use } from 'react';
import { invariant } from '../../utils/invariant.js';

interface ConfigContext {
  monitorUrl: string;
}

export const ConfigContext = createContext<ConfigContext | undefined>(undefined);

// TODO: should throw warning
export const Provider: React.FC = () => {
  return null;
};

export const useConfig = () => {
  const context = use(ConfigContext);
  invariant(context, 'To use config, you have to use ConfigContext.Provider');

  return context;
};
