import { useCallback, useEffect, useRef } from 'react';
import { onCLS, onFCP, onTTFB, onINP, Metric } from 'web-vitals';
import { useConfig } from '../context/config/config.context';
import z from 'zod';

const INTERVAL_TIME = 10_000; // 10 sec
const MAX_RETRIES = 3;

export const useMetrics = () => {
  const { fetcher } = useConfig();
  const metrics = useRef(new Set<Metric>());
  const intervalRef = useRef<number>(null);
  const isFlushing = useRef(false);

  const flush = useCallback(() => {
    isFlushing.current = true;
    const shallowCopy = new Set([...metrics.current]);
    metrics.current.clear();
    const attempt = (retryNumber: number) => {
      // Fire and forget
      void fetcher
        .fetch({
          endpoint: '/api/metrics',
          schema: z.object({ ok: z.literal(true) }),
          config: {
            method: 'POST',
            body: JSON.stringify([...shallowCopy])
          }
        })
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
            for (const item of shallowCopy) {
              metrics.current.add(item);
            }
            isFlushing.current = false;
          }
        });
    };
    attempt(0);
  }, [fetcher]);

  const addToMetric = useCallback(
    (metric: Metric) => {
      metrics.current.add(metric);
      if (metrics.current.size >= 10 && isFlushing.current === false) {
        flush();
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          if (isFlushing.current === false) {
            flush();
          }
        }, INTERVAL_TIME);
      }
    },
    [flush]
  );

  useEffect(() => {
    onCLS(addToMetric);
    onTTFB(addToMetric);
    onFCP(addToMetric);
    onINP((metric) => addToMetric(metric));
    intervalRef.current = setInterval(() => {
      if (isFlushing.current === false) {
        flush();
      }
    }, INTERVAL_TIME);

    return () => {
      clearInterval(intervalRef.current);
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
