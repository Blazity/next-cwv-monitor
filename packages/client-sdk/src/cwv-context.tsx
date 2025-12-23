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

export type CWVView = {
  route: string;
  path: string;
};

export type CWVRuntime = {
  ingestQueue: IngestQueue;
  getSessionId: () => string;
  rotateSessionId: () => string;
  getView: () => CWVView;
  onViewChange: (view: CWVView) => void;
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
  const viewRef = useRef<CWVView | undefined>(undefined);
  const lastTrackedPathRef = useRef<string | undefined>(undefined);

  const getSessionId = useCallback(() => {
    sessionIdRef.current ??= generateSessionId();
    return sessionIdRef.current;
  }, []);

  const rotateSessionId = useCallback(() => {
    sessionIdRef.current = generateSessionId();
    return sessionIdRef.current;
  }, []);

  const getView = useCallback((): CWVView => {
    if (viewRef.current) return viewRef.current;
    if (typeof window === 'undefined') return { route: '/', path: '/' };
    const path = window.location.pathname || '/';
    return { route: path, path };
  }, []);

  const onViewChange = useCallback(
    (nextView: CWVView): void => {
      const route = nextView.route?.trim() || '/';
      const path = nextView.path?.trim() || '/';

      viewRef.current = { route, path };

      if (typeof window === 'undefined') return;
      if (path === lastTrackedPathRef.current) return;
      lastTrackedPathRef.current = path;

      const sessionId = rotateSessionId();
      ingestQueue.primeCwvSamplingDecision(sessionId);

      ingestQueue.enqueueCustomEvent({
        name: '$page_view',
        sessionId,
        route,
        path,
        recordedAt: new Date().toISOString()
      });
    },
    [ingestQueue, rotateSessionId]
  );

  const runtime = useMemo(
    () => ({ ingestQueue, getSessionId, rotateSessionId, getView, onViewChange }),
    [getSessionId, getView, ingestQueue, onViewChange, rotateSessionId]
  );

  const value = useMemo(() => ({ config, runtime }), [config, runtime]);

  const sampleRate = config.sampleRate ?? 1;
  invariant(sampleRate >= 0 && sampleRate <= 1, 'sampleRate must be between 0 and 1');

  return <CWVContext.Provider value={value}>{children}</CWVContext.Provider>;
};
