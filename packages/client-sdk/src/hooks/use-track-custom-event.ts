import type { CustomEventV1In } from 'cwv-monitor-contracts';
import { useCallback } from 'react';
import { useCWV } from '../cwv-context';
import { getFullPath, getNormalizedRoute } from '../utils/navigation';

export type TrackCustomEventOptions = {
  route?: string;
  path?: string;
  recordedAt?: string;
};

export type TrackCustomEvent = (name: string, options?: TrackCustomEventOptions) => void;

export function useTrackCustomEvent(): TrackCustomEvent {
  const { runtime } = useCWV();
  const { ingestQueue, getSessionId } = runtime;

  return useCallback<TrackCustomEvent>(
    (name, options) => {
      if (typeof window === 'undefined') return;

      const payload: CustomEventV1In = {
        name,
        sessionId: getSessionId(),
        route: options?.route ?? getNormalizedRoute(),
        path: options?.path ?? getFullPath(),
        recordedAt: options?.recordedAt ?? new Date().toISOString()
      };

      ingestQueue.enqueueCustomEvent(payload);
    },
    [getSessionId, ingestQueue]
  );
}
