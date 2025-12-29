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
const APP_JSON = 'application/json';
const API_PATH = '/api/ingest';
const VIS_CHANGE = 'visibilitychange';

type AttemptArgs = {
  _cwvCopy: WebVitalEventV1In[];
  _customCopy: CustomEventV1In[];
  _retryNumber: number;
  _reason: FlushReason;
};

export class IngestQueue {
  private _config: IngestQueueConfig | undefined;

  private readonly _cwvEvents = new Set<WebVitalEventV1In>();
  private readonly _customEvents = new Set<CustomEventV1In>();
  private _cwvSamplingDecision: { sessionId: string; sampled: boolean } | undefined;

  private _debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private _isFlushing = false;
  private _trackingDisabled = false;
  private _pendingFlush = false;
  private _unloadHandlersAttached = false;

  private readonly _debounceTimeMs: number;
  private readonly _maxRetries: number;

  private readonly _handleUnload = (): void => {
    this._flushInternal('unload');
  };

  private readonly _handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      this._handleUnload();
    }
  };

  constructor(config?: IngestQueueConfig, options?: IngestQueueOptions) {
    this._config = config;
    this._debounceTimeMs = options?.debounceTimeMs ?? DEFAULT_DEBOUNCE_TIME_MS;
    this._maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  _configure(nextConfig: IngestQueueConfig): void {
    const wasConfigured = !!this._config;
    this._config = nextConfig;
    if (!wasConfigured && this._getQueuedCount() > 0) {
      this._scheduleDebouncedFlush();
    }
  }

  _start(): void {
    this._toggleHandlers(true);
  }

  _stop(): void {
    if (this._debounceTimeoutId) {
      clearTimeout(this._debounceTimeoutId);
      this._debounceTimeoutId = null;
    }
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
    this._toggleHandlers(false);
  }

  _isIngestQueueFlushing(): boolean {
    return this._isFlushing;
  }

  _getCwvEventQueue(): Set<WebVitalEventV1In> {
    return this._cwvEvents;
  }

  _enqueueCwvEvent(event: WebVitalEventV1In): void {
    if (this._trackingDisabled) return;

    const sessionId = event.sessionId;
    if (sessionId) {
      if (!this._isCwvSampledForSession(sessionId)) {
        return;
      }
    } else {
      if (!this._randomlySampleCwv()) {
        return;
      }
    }

    this._cwvEvents.add(event);
    this._onEnqueued();
  }

  _enqueueCustomEvent(event: CustomEventV1In): void {
    if (this._trackingDisabled) return;

    this._customEvents.add(event);
    this._onEnqueued();
  }

  _primeCwvSamplingDecision(sessionId: string): void {
    if (!this._config) return;
    if (this._trackingDisabled) return;
    if (!sessionId) return;

    this._isCwvSampledForSession(sessionId);
  }

  _flush(): void {
    this._flushInternal('manual');
  }

  _resetForTests(): void {
    this._stop();
    this._config = undefined;
    this._cwvEvents.clear();
    this._customEvents.clear();
    this._cwvSamplingDecision = undefined;
    this._isFlushing = false;
    this._trackingDisabled = false;
    this._pendingFlush = false;
  }

  private _getQueuedCount(): number {
    return this._cwvEvents.size + this._customEvents.size;
  }

  private _onEnqueued(): void {
    if (this._isFlushing) {
      this._pendingFlush = true;
      return;
    }

    this._scheduleDebouncedFlush();
  }

  private _scheduleDebouncedFlush(): void {
    this._pendingFlush = true;
    if (this._isFlushing) return;

    if (this._debounceTimeoutId) {
      clearTimeout(this._debounceTimeoutId);
    }

    this._debounceTimeoutId = setTimeout(() => {
      this._debounceTimeoutId = null;
      this._flushInternal('debounce');
    }, this._debounceTimeMs);
  }

  private _flushInternal(reason: FlushReason): void {
    if (this._trackingDisabled) return;
    if (!this._config) return;
    if (this._getQueuedCount() === 0) return;
    if (this._isFlushing) {
      this._pendingFlush = true;
      return;
    }

    this._pendingFlush = false;
    this._isFlushing = true;
    if (this._debounceTimeoutId) {
      clearTimeout(this._debounceTimeoutId);
      this._debounceTimeoutId = null;
    }

    const cwvCopy = [...this._cwvEvents];
    const customCopy = [...this._customEvents];
    this._cwvEvents.clear();
    this._customEvents.clear();

    this._attemptFlush({ _cwvCopy: cwvCopy, _customCopy: customCopy, _retryNumber: 0, _reason: reason });
  }

  private _attemptFlush({ _cwvCopy: cwvCopy, _customCopy: customCopy, _retryNumber, _reason: reason }: AttemptArgs): void {
    const cfg = this._config;
    if (!cfg) {
      for (const event of cwvCopy) this._cwvEvents.add(event);
      for (const event of customCopy) this._customEvents.add(event);
      this._isFlushing = false;
      return;
    }

    const body: IngestPayloadV1In = {
      projectId: cfg.projectId,
      ...(cwvCopy.length > 0 && { events: cwvCopy }),
      ...(customCopy.length > 0 && { customEvents: customCopy })
    };

    const url = buildIngestUrl(cfg.endpoint);

    if (reason === 'unload' && trySendBeacon(url, body)) {
      this._isFlushing = false;
      if (this._pendingFlush || this._getQueuedCount() > 0) {
        this._scheduleDebouncedFlush();
      }
      return;
    }

    const controller = typeof cfg.abortTime === 'number' ? new AbortController() : undefined;
    const abortTimeout =
      typeof cfg.abortTime === 'number' ? setTimeout(() => controller?.abort(), cfg.abortTime) : undefined;

    const _request = async () => {
      const response = await fetch(url, {
        method: 'POST',
        keepalive: true,
        signal: controller?.signal,
        headers: { 'Content-Type': APP_JSON },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error();
    };

    void _request()
      .then(() => {
        this._isFlushing = false;
        if (this._retryTimeoutId) {
          clearTimeout(this._retryTimeoutId);
          this._retryTimeoutId = null;
        }
        if (this._pendingFlush || this._getQueuedCount() > 0) {
          this._scheduleDebouncedFlush();
        }
      })
      .catch(() => {
        if (reason === 'unload' || _retryNumber >= this._maxRetries) {
          this._isFlushing = false;
          this._trackingDisabled = true;
        } else {
          this._retryTimeoutId = setTimeout(
            () => {
              this._attemptFlush({ _cwvCopy: cwvCopy, _customCopy: customCopy, _retryNumber: _retryNumber + 1, _reason: reason });
            },
            100 * 2 ** _retryNumber
          );
        }
      })
      .finally(() => abortTimeout && clearTimeout(abortTimeout));
  }

  private _isCwvSampledForSession(sessionId: string): boolean {
    if (this._cwvSamplingDecision?.sessionId === sessionId) {
      return this._cwvSamplingDecision.sampled;
    }

    const sampled = this._randomlySampleCwv();
    this._cwvSamplingDecision = { sessionId, sampled };

    return sampled;
  }

  private _randomlySampleCwv(): boolean {
    const sampleRate = parseSampleRate(this._config?.sampleRate);
    return Math.random() < sampleRate;
  }

  private _toggleHandlers(add: boolean): void {
    if (typeof window === 'undefined' || this._unloadHandlersAttached === add) return;
    this._unloadHandlersAttached = add;

    const m = add ? 'addEventListener' : 'removeEventListener';
    const opt = { capture: true };

    window[m]('pagehide', this._handleUnload, opt);
    window[m]('beforeunload', this._handleUnload, opt);
    document[m](VIS_CHANGE, this._handleVisibilityChange, opt);
  }
}

function parseSampleRate(value: number | undefined): number {
  const n = typeof value === 'number' ? value : 1;
  return Math.max(0, Math.min(1, isFinite(n) ? n : 1));
}

function buildIngestUrl(baseUrl: string): string {
  try {
    return new URL(API_PATH, baseUrl).toString();
  } catch {
    return baseUrl.replace(/\/$/, '') + API_PATH;
  }
}

function trySendBeacon(url: string, body: IngestPayloadV1In): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;

  try {
    return navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: APP_JSON }));
  } catch {
    return false;
  }
}
