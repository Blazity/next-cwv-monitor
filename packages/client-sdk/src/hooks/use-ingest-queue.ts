import { useEffect } from 'react';
import { useCWV } from '../cwv-context';

export function useIngestQueueLifecycle(): void {
  const { config, runtime } = useCWV();
  const { endpoint, abortTime, projectId } = config;
  const sampleRate = config.sampleRate ?? 1;
  const { _ingestQueue } = runtime;

  useEffect(() => {
    _ingestQueue._configure({ endpoint, abortTime, projectId, sampleRate });
    _ingestQueue._start();

    return () => {
      _ingestQueue._stop();
      if (!_ingestQueue._isIngestQueueFlushing()) {
        _ingestQueue._flush();
      }
    };
  }, [abortTime, endpoint, _ingestQueue, projectId, sampleRate]);
}
