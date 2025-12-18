import { useEffect } from 'react';
import { useCWV } from '../cwv-context';

export function useIngestQueueLifecycle(): void {
  const { config, runtime } = useCWV();
  const { endpoint, abortTime, projectId } = config;
  const sampleRate = config.sampleRate ?? 1;
  const { ingestQueue } = runtime;

  useEffect(() => {
    ingestQueue.configure({ endpoint, abortTime, projectId, sampleRate });
    ingestQueue.start();

    return () => {
      ingestQueue.stop();
      if (!ingestQueue.isIngestQueueFlushing()) {
        ingestQueue.flush();
      }
    };
  }, [abortTime, endpoint, ingestQueue, projectId, sampleRate]);
}
