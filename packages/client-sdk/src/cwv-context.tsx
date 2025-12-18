/* eslint-disable react-refresh/only-export-components */
import { createContext, PropsWithChildren, use, useCallback, useMemo, useRef } from 'react';
import { IngestQueue } from './utils/ingest-queue';
import { invariant } from './utils/invariant';
import { generateSessionId } from './utils/session-id';

export type CWVConfig = {
  endpoint: string;
  projectId: string;
  abortTime?: number;
  sampleRate?: number;
};

export type CWVRuntime = {
  ingestQueue: IngestQueue;
  getSessionId: () => string;
  rotateSessionId: () => string;
};

export type CWVContextValue = {
  config: CWVConfig;
  runtime: CWVRuntime;
};

export const CWVContext = createContext<CWVContextValue | undefined>(undefined);

export const useCWV = (): CWVContextValue => {
  const context = use(CWVContext);
  invariant(context, 'useCWV() called outside of CWVContext');
  return context;
};

export const CWVProvider = ({ children, config }: PropsWithChildren<{ config: CWVConfig }>) => {
  const ingestQueue = useMemo(() => new IngestQueue(), []);
  const sessionIdRef = useRef<string | undefined>(undefined);

  const getSessionId = useCallback(() => {
    sessionIdRef.current ??= generateSessionId();
    return sessionIdRef.current;
  }, []);

  const rotateSessionId = useCallback(() => {
    sessionIdRef.current = generateSessionId();
    return sessionIdRef.current;
  }, []);

  const runtime = useMemo(
    () => ({ ingestQueue, getSessionId, rotateSessionId }),
    [getSessionId, ingestQueue, rotateSessionId]
  );

  const value = useMemo(() => ({ config, runtime }), [config, runtime]);

  const sampleRate = config.sampleRate ?? 1;
  invariant(sampleRate >= 0 && sampleRate <= 1, 'sampleRate must be between 0 and 1');

  return <CWVContext.Provider value={value}>{children}</CWVContext.Provider>;
};
