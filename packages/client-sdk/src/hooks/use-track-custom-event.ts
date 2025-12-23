import type { CustomEventV1In } from 'cwv-monitor-contracts';
import { useCallback } from 'react';
import { useCWV } from '../cwv-context';

export type TrackCustomEventOptions = {
  route?: string;
  path?: string;
  recordedAt?: string;
};

export type TrackCustomEvent = (name: string, options?: TrackCustomEventOptions) => void;

export function useTrackCustomEvent(): TrackCustomEvent {
  const { runtime } = useCWV();
  const { ingestQueue, getSessionId, getView } = runtime;

  return useCallback<TrackCustomEvent>(
    (name, options) => {
      if (typeof window === 'undefined') return;
      const view = getView();

      const payload: CustomEventV1In = {
        name,
        sessionId: getSessionId(),
        route: options?.route ?? view.route,
        path: options?.path ?? view.path,
        recordedAt: options?.recordedAt ?? new Date().toISOString()
      };

      ingestQueue.enqueueCustomEvent(payload);
    },
    [getSessionId, getView, ingestQueue]
  );
}
