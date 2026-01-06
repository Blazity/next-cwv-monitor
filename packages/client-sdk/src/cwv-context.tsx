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
  useBeacon?: boolean;
};

export type CWVView = {
  route: string;
  path: string;
};

export type CWVRuntime = {
  _ingestQueue: IngestQueue;
  _getSessionId: () => string;
  _rotateSessionId: () => string;
  _getView: () => CWVView;
  _onViewChange: (view: CWVView) => void;
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
  const _ingestQueue = useMemo(() => new IngestQueue(), []);
  const _sidRef = useRef<string | undefined>(undefined);
  const _viewRef = useRef<CWVView | undefined>(undefined);
  const _lastPathRef = useRef<string | undefined>(undefined);

  const _getSessionId = useCallback(() => (_sidRef.current ??= generateSessionId()), []);

  const _rotateSessionId = useCallback(() => (_sidRef.current = generateSessionId()), []);

  const _getView = useCallback((): CWVView => {
    const loc = typeof window !== 'undefined' ? window.location.pathname : '/';
    return _viewRef.current || { route: loc, path: loc };
  }, []);

  const _onViewChange = useCallback(
    (nextView: CWVView): void => {
      const route = nextView.route?.trim() || '/';
      const path = nextView.path?.trim() || '/';

      _viewRef.current = { route, path };

      if (typeof window !== 'undefined' && path !== _lastPathRef.current) {
        _lastPathRef.current = path;
        const sid = _rotateSessionId();
        _ingestQueue._primeCwvSamplingDecision(sid);
        _ingestQueue._enqueueCustomEvent({
          name: '$page_view',
          sessionId: sid,
          route,
          path,
          recordedAt: new Date().toISOString()
        });
      }
    },
    [_ingestQueue, _rotateSessionId]
  );

  const value = useMemo(() => {
    const s = config.sampleRate ?? 1;
    invariant(s >= 0 && s <= 1, 'sampleRate must be between 0 and 1');
    return {
      config,
      runtime: {
        _ingestQueue,
        _getSessionId,
        _rotateSessionId,
        _getView,
        _onViewChange
      }
    };
  }, [config, _ingestQueue, _getSessionId, _rotateSessionId, _getView, _onViewChange]);

  return <CWVContext.Provider value={value}>{children}</CWVContext.Provider>;
};
