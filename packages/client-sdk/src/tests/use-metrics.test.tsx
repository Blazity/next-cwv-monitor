import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import * as React from 'react';
import { render, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { CWVMonitor, useTrackCustomEvent } from '../index';
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn()
}));

const createFetchResponse = () => ({
  ok: true,
  json: vi.fn().mockResolvedValue({ ok: true })
});

type FetchMockFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<ReturnType<typeof createFetchResponse>>;
const fetchMock = vi.fn<FetchMockFn>(() => Promise.resolve(createFetchResponse()));
vi.stubGlobal('fetch', fetchMock);

import { onCLS, onLCP } from 'web-vitals';

const resetMocks = () => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(createFetchResponse());
};

const createWrapper =
  (sampleRate = 1) =>
  ({ children }: React.PropsWithChildren) => {
    return (
      <CWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={sampleRate}>
        {children}
      </CWVMonitor>
    );
  };

describe('Client SDK public API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetMocks();
  });

  it('Flushes after debounce time (50ms)', async () => {
    render(<CWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={1} />);
    expect(onCLS).toHaveBeenCalled();
    expect(onLCP).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1, rating: 'good' };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    add(fakeMetric);
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(49);
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Sends the same sessionId for CWV and custom events', async () => {
    const wrapper = createWrapper(1);
    const { result: trackResult } = renderHook(() => useTrackCustomEvent(), { wrapper });

    // `$page_view` is tracked automatically. Flush it first to keep the assertions focused.
    await vi.advanceTimersByTimeAsync(50);
    fetchMock.mockClear();

    const add = (onCLS as Mock).mock.calls[0]?.[0];
    expect(typeof add).toBe('function');

    for (let i = 0; i < 8; i++) {
      add({ name: 'CLS', value: 1, rating: 'good', i });
    }

    trackResult.current('purchase');

    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1];
    const body = request?.body ? JSON.parse(String(request.body)) : null;

    expect(body?.events).toHaveLength(8);
    expect(body?.customEvents).toHaveLength(1);
    const purchase = body?.customEvents?.find((e: { name: string }) => e.name === 'purchase');
    expect(purchase?.sessionId).toBe(body?.events?.[0]?.sessionId);
  });

  it('Samples CWV events per page view (sessionId)', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValueOnce(0.4);

    render(<CWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={0.5} />);
    expect(onCLS).toHaveBeenCalled();

    // `$page_view` is tracked automatically. Flush it first so this test only asserts the sampling behavior.
    await vi.advanceTimersByTimeAsync(50);
    fetchMock.mockClear();

    const add = (onCLS as Mock).mock.calls[0]?.[0];
    expect(typeof add).toBe('function');

    add({ name: 'CLS', value: 1, rating: 'good', i: 1 });
    add({ name: 'CLS', value: 1, rating: 'good', i: 2 });

    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(randomSpy).toHaveBeenCalledTimes(1);

    randomSpy.mockRestore();
  });

  it('Retries a failed flush once', async () => {
    render(<CWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={1} />);

    // `$page_view` is tracked automatically. Flush it first so it doesn't affect retry assertions.
    await vi.advanceTimersByTimeAsync(50);
    fetchMock.mockClear();

    fetchMock.mockRejectedValueOnce(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });

    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
