import { useCallback, useEffect, useRef } from 'react';
import { onCLS, onFCP, onTTFB, onINP, onLCP, Metric } from 'web-vitals';
import { useConfig } from '../context/config/config.context';
import type { IngestPayloadV1In, WebVitalEventV1In } from 'cwv-monitor-contracts';

type Payload = WebVitalEventV1In;

const INTERVAL_TIME = 10_000; // 10 sec
const MAX_RETRIES = 3;

export const useMetrics = () => {
  const { endpoint, abortTime, projectId, sampleRate = '1.0' } = useConfig();
  const metrics = useRef(new Set<Payload>());
  const intervalRef = useRef<number>(null);
  const isFlushing = useRef(false);
  const disableWork = useRef(false);

  const flush = useCallback(() => {
    if (disableWork.current === true || metrics.current.size === 0) return;
    isFlushing.current = true;
    const shallowCopy = new Set([...metrics.current]);
    metrics.current.clear();

    const attempt = (retryNumber: number) => {
      const controller = typeof abortTime === 'number' ? new AbortController() : undefined;
      const abortTimeout = typeof abortTime === 'number' ? setTimeout(() => controller?.abort(), abortTime) : undefined;

      const request = async () => {
        const response = await fetch(buildIngestUrl(endpoint), {
          method: 'POST',
          keepalive: true,
          signal: controller?.signal,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projectId,
            events: [...shallowCopy]
          } satisfies IngestPayloadV1In)
        });

        if (!response.ok) {
          throw new Error('Failed to receive data');
        }
        return null;
      };

      // Fire and forget
      void request()
        .then(() => {
          isFlushing.current = false;
        })
        .catch(() => {
          const retriesReached = retryNumber >= MAX_RETRIES;
          if (!retriesReached) {
            const delay = 100 * 2 ** retryNumber; // 100ms, 200ms, 400ms, 800ms etc...
            intervalRef.current = setTimeout(() => {
              attempt(retryNumber + 1);
            }, delay);
          } else {
            // TODO: Verify whether we need to chunk data if size is > 64KB
            isFlushing.current = false;
            disableWork.current = true;
          }
        })
        .finally(() => {
          if (typeof abortTimeout !== 'undefined') {
            clearTimeout(abortTimeout);
          }
        });
    };
    attempt(0);
  }, [abortTime, endpoint, projectId]);

  const clearIntervalRef = () => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
  };

  const addToMetric = useCallback(
    (metric: Metric) => {
      if (disableWork.current === true) return;
      if (Math.random() > parseFloat(sampleRate)) return;

      const route = getNormalizedRoute();
      const path = getFullPath();
      const recordedAt = new Date().toISOString();
      const payload: Payload = {
        sessionId: metric.id,
        route,
        path,
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        recordedAt
      };

      metrics.current.add(payload);

      if (metrics.current.size < 10 || isFlushing.current === true) return;
      flush();
      clearIntervalRef();
      intervalRef.current = setInterval(() => {
        if (isFlushing.current === false) {
          flush();
        }
      }, INTERVAL_TIME);
    },
    [sampleRate, flush]
  );

  useEffect(() => {
    onCLS(addToMetric);
    onTTFB(addToMetric);
    onFCP(addToMetric);
    onLCP(addToMetric);
    onINP(addToMetric);

    intervalRef.current = setInterval(() => {
      if (isFlushing.current === false) {
        flush();
      }
    }, INTERVAL_TIME);

    return () => {
      clearIntervalRef();
      intervalRef.current = null;
      if (isFlushing.current === false) {
        flush();
      }
    };
  }, [addToMetric, flush]);

  if (process.env.NODE_ENV === 'test') {
    return { metrics };
  }
};

const getNormalizedRoute = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
};

const getFullPath = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
};

const buildIngestUrl = (baseUrl: string) => {
  try {
    return new URL('/api/ingest', baseUrl).toString();
  } catch {
    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalized}/api/ingest`;
  }
};
