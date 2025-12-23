import type { CustomEventV1In, IngestPayloadV1In, WebVitalEventV1In } from 'cwv-monitor-contracts';

export type IngestQueueConfig = {
  endpoint: string;
  projectId: string;
  abortTime?: number;
  sampleRate?: number;
};

export type FlushReason = 'manual' | 'debounce' | 'unload';

export type IngestQueueOptions = {
  debounceTimeMs?: number;
  maxRetries?: number;
};

const DEFAULT_DEBOUNCE_TIME_MS = 50;
const DEFAULT_MAX_RETRIES = 3;

type AttemptArgs = {
  cwvCopy: WebVitalEventV1In[];
  customCopy: CustomEventV1In[];
  retryNumber: number;
  reason: FlushReason;
};

export class IngestQueue {
  private config: IngestQueueConfig | undefined;

  private readonly cwvEvents = new Set<WebVitalEventV1In>();
  private readonly customEvents = new Set<CustomEventV1In>();
  private cwvSamplingDecision: { sessionId: string; sampled: boolean } | undefined;

  private debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private isFlushing = false;
  private trackingDisabled = false;
  private pendingFlush = false;
  private unloadHandlersAttached = false;

  private readonly debounceTimeMs: number;
  private readonly maxRetries: number;

  private readonly handleUnload = (): void => {
    this.flushInternal('unload');
  };

  private readonly handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      this.handleUnload();
    }
  };

  constructor(config?: IngestQueueConfig, options?: IngestQueueOptions) {
    this.config = config;
    this.debounceTimeMs = options?.debounceTimeMs ?? DEFAULT_DEBOUNCE_TIME_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  configure(nextConfig: IngestQueueConfig): void {
    const wasConfigured = Boolean(this.config);
    this.config = nextConfig;
    if (!wasConfigured && this.getQueuedCount() > 0) {
      this.scheduleDebouncedFlush();
    }
  }

  start(): void {
    this.attachUnloadHandlers();
  }

  stop(): void {
    if (this.debounceTimeoutId) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.detachUnloadHandlers();
  }

  isIngestQueueFlushing(): boolean {
    return this.isFlushing;
  }

  getCwvEventQueue(): Set<WebVitalEventV1In> {
    return this.cwvEvents;
  }

  enqueueCwvEvent(event: WebVitalEventV1In): void {
    if (this.trackingDisabled) return;

    const sessionId = event.sessionId;
    if (sessionId) {
      if (!this.isCwvSampledForSession(sessionId)) {
        return;
      }
    } else {
      if (!this.randomlySampleCwv()) {
        return;
      }
    }

    this.cwvEvents.add(event);
    this.onEnqueued();
  }

  enqueueCustomEvent(event: CustomEventV1In): void {
    if (this.trackingDisabled) return;

    this.customEvents.add(event);
    this.onEnqueued();
  }

  primeCwvSamplingDecision(sessionId: string): void {
    if (!this.config) return;
    if (this.trackingDisabled) return;
    if (!sessionId) return;

    this.isCwvSampledForSession(sessionId);
  }

  flush(): void {
    this.flushInternal('manual');
  }

  resetForTests(): void {
    this.stop();
    this.config = undefined;
    this.cwvEvents.clear();
    this.customEvents.clear();
    this.cwvSamplingDecision = undefined;
    this.isFlushing = false;
    this.trackingDisabled = false;
    this.pendingFlush = false;
  }

  private getQueuedCount(): number {
    return this.cwvEvents.size + this.customEvents.size;
  }

  private onEnqueued(): void {
    if (this.isFlushing) {
      this.pendingFlush = true;
      return;
    }

    this.scheduleDebouncedFlush();
  }

  private scheduleDebouncedFlush(): void {
    this.pendingFlush = true;
    if (this.isFlushing) return;

    if (this.debounceTimeoutId) {
      clearTimeout(this.debounceTimeoutId);
    }

    this.debounceTimeoutId = setTimeout(() => {
      this.debounceTimeoutId = null;
      this.flushInternal('debounce');
    }, this.debounceTimeMs);
  }

  private flushInternal(reason: FlushReason): void {
    if (this.trackingDisabled) return;
    if (!this.config) return;
    if (this.getQueuedCount() === 0) return;
    if (this.isFlushing) {
      this.pendingFlush = true;
      return;
    }

    this.pendingFlush = false;
    this.isFlushing = true;
    if (this.debounceTimeoutId) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }

    const cwvCopy = [...this.cwvEvents];
    const customCopy = [...this.customEvents];
    this.cwvEvents.clear();
    this.customEvents.clear();

    this.attemptFlush({ cwvCopy, customCopy, retryNumber: 0, reason });
  }

  private attemptFlush({ cwvCopy, customCopy, retryNumber, reason }: AttemptArgs): void {
    const cfg = this.config;
    if (!cfg) {
      for (const event of cwvCopy) this.cwvEvents.add(event);
      for (const event of customCopy) this.customEvents.add(event);
      this.isFlushing = false;
      return;
    }

    const body: IngestPayloadV1In = {
      projectId: cfg.projectId,
      ...(cwvCopy.length > 0 ? { events: cwvCopy } : {}),
      ...(customCopy.length > 0 ? { customEvents: customCopy } : {})
    };

    const url = buildIngestUrl(cfg.endpoint);

    if (reason === 'unload' && trySendBeacon(url, body)) {
      this.isFlushing = false;
      if (this.pendingFlush || this.getQueuedCount() > 0) {
        this.scheduleDebouncedFlush();
      }
      return;
    }

    const controller = typeof cfg.abortTime === 'number' ? new AbortController() : undefined;
    const abortTimeout =
      typeof cfg.abortTime === 'number' ? setTimeout(() => controller?.abort(), cfg.abortTime) : undefined;

    const request = async () => {
      const response = await fetch(url, {
        method: 'POST',
        keepalive: true,
        signal: controller?.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to receive data');
      }
    };

    void request()
      .then(() => {
        this.isFlushing = false;
        if (this.retryTimeoutId) {
          clearTimeout(this.retryTimeoutId);
          this.retryTimeoutId = null;
        }
        if (this.pendingFlush || this.getQueuedCount() > 0) {
          this.scheduleDebouncedFlush();
        }
      })
      .catch(() => {
        const retriesReached = reason === 'unload' || retryNumber >= this.maxRetries;
        if (!retriesReached) {
          const delay = 100 * 2 ** retryNumber;
          this.retryTimeoutId = setTimeout(() => {
            this.attemptFlush({ cwvCopy, customCopy, retryNumber: retryNumber + 1, reason });
          }, delay);
        } else {
          this.isFlushing = false;
          this.trackingDisabled = true;
        }
      })
      .finally(() => {
        if (typeof abortTimeout !== 'undefined') {
          clearTimeout(abortTimeout);
        }
      });
  }

  private isCwvSampledForSession(sessionId: string): boolean {
    if (this.cwvSamplingDecision?.sessionId === sessionId) {
      return this.cwvSamplingDecision.sampled;
    }

    const sampled = this.randomlySampleCwv();
    this.cwvSamplingDecision = { sessionId, sampled };

    return sampled;
  }

  private randomlySampleCwv(): boolean {
    const sampleRate = parseSampleRate(this.config?.sampleRate);
    return Math.random() < sampleRate;
  }

  private attachUnloadHandlers(): void {
    if (this.unloadHandlersAttached) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.unloadHandlersAttached = true;
    window.addEventListener('pagehide', this.handleUnload, { capture: true });
    window.addEventListener('beforeunload', this.handleUnload, { capture: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { capture: true });
  }

  private detachUnloadHandlers(): void {
    if (!this.unloadHandlersAttached) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.unloadHandlersAttached = false;
    window.removeEventListener('pagehide', this.handleUnload, { capture: true });
    window.removeEventListener('beforeunload', this.handleUnload, { capture: true });
    document.removeEventListener('visibilitychange', this.handleVisibilityChange, { capture: true });
  }
}

function parseSampleRate(value: number | undefined): number {
  const parsed = typeof value === 'number' ? value : 1;
  if (!Number.isFinite(parsed)) return 1;
  if (parsed <= 0) return 0;
  if (parsed >= 1) return 1;
  return parsed;
}

function buildIngestUrl(baseUrl: string): string {
  try {
    return new URL('/api/ingest', baseUrl).toString();
  } catch {
    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalized}/api/ingest`;
  }
}

function trySendBeacon(url: string, body: IngestPayloadV1In): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.sendBeacon !== 'function') return false;

  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}
