import { useCallback, useEffect, useRef } from 'react';
import { onCLS, onFCP, onTTFB, onINP, Metric } from 'web-vitals';
import { useConfig } from '../context/config/config.context';
import z from 'zod';
import { getDeviceType, DeviceType } from '../utils/get-device-type';
import { getConnectionType } from '../utils/get-connection-type';

interface Payload {
  metric: Metric;
  timestamp: number;
  deviceType: DeviceType;
  connectionType: string;
  userAgent: string;
  customDimensions?: Record<string, unknown>;
}

const INTERVAL_TIME = 10_000; // 10 sec
const MAX_RETRIES = 3;

export const useMetrics = () => {
  const { fetcher, sampleRate = '1.0', customDimensions } = useConfig();
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
            isFlushing.current = false;
            disableWork.current = true;
          }
        });
    };
    attempt(0);
  }, [fetcher]);

  const clearIntervalRef = () => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
  };

  const addToMetric = useCallback(
    (metric: Metric) => {
      if (disableWork.current === true) return;
      if (Math.random() > parseFloat(sampleRate)) return;

      metrics.current.add({
        metric,
        ...(typeof customDimensions !== 'undefined' && { customDimensions }),
        timestamp: Date.now(),
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        connectionType: getConnectionType()
      });

      if (metrics.current.size < 10 || isFlushing.current === true) return;
      flush();
      clearIntervalRef();
      intervalRef.current = setInterval(() => {
        if (isFlushing.current === false) {
          flush();
        }
      }, INTERVAL_TIME);
    },
    [sampleRate, flush, customDimensions]
  );

  useEffect(() => {
    onCLS(addToMetric);
    onTTFB(addToMetric);
    onFCP(addToMetric);
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
