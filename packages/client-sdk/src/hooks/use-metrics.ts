import { useCallback, useEffect, useRef } from 'react';
import { onCLS, onFCP, onTTFB, onINP, onLCP, Metric } from 'web-vitals';
import type { WebVitalEventV1In } from 'cwv-monitor-contracts';
import { useCWV } from '../cwv-context';

type Payload = WebVitalEventV1In;

export const useMetrics = () => {
  const { runtime } = useCWV();
  const { _ingestQueue, _getSessionId, _getView } = runtime;
  const metrics = useRef(_ingestQueue._getCwvEventQueue());

  const addToMetric = useCallback(
    (metric: Metric) => {
      const { route, path } = _getView();
      const recordedAt = new Date().toISOString();
      const sessionId = _getSessionId();
      const payload: Payload = {
        sessionId,
        route,
        path,
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        recordedAt
      };

      _ingestQueue._enqueueCwvEvent(payload);
    },
    [_getSessionId, _getView, _ingestQueue]
  );

  const addToMetricRef = useRef(addToMetric);
  useEffect(() => {
    addToMetricRef.current = addToMetric;
  }, [addToMetric]);

  useEffect(() => {
    // `web-vitals` doesn't expose an unsubscribe API for these listeners, so we register once
    // and route calls through a ref to always use the latest callback.
    const handler = (metric: Metric) => addToMetricRef.current(metric);
    onCLS(handler);
    onTTFB(handler);
    onFCP(handler);
    onLCP(handler);
    onINP(handler);
  }, []);

  return { metrics };
};
