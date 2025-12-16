import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import type { ConfigContext } from '../context/config/config.context';
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn()
}));

const useConfigMock = vi.hoisted(() => vi.fn<() => ConfigContext>());

const createFetchResponse = () => ({
  ok: true,
  json: vi.fn().mockResolvedValue({ ok: true })
});

const fetchMock = vi.fn(() => Promise.resolve(createFetchResponse()));
vi.stubGlobal('fetch', fetchMock);

const createConfig = (): ConfigContext => ({
  endpoint: 'https://monitor-app.test',
  projectId: 'test-project',
  sampleRate: '1.0'
});

useConfigMock.mockImplementation(createConfig);

vi.mock('../context/config/config.context', () => ({
  useConfig: useConfigMock
}));

import { renderHook, act } from '@testing-library/react';

import { useMetrics } from '../hooks/use-metrics';
import { onCLS, onLCP } from 'web-vitals';

const resetMocks = () => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(createFetchResponse());
  useConfigMock.mockReset();
  useConfigMock.mockImplementation(createConfig);
};

describe('Test useMetric flush method', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetMocks();
  });

  it('Should flush immediatly when 10 in que', async () => {
    renderHook(() => useMetrics());

    expect(onCLS).toHaveBeenCalled();
    expect(onLCP).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Should no flush on unmount because it is flushing', async () => {
    const { unmount } = renderHook(() => useMetrics());

    expect(onCLS).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Should flush when the component unmounts 2 seconds after the last flush.', async () => {
    const { unmount } = renderHook(() => useMetrics());

    expect(onCLS).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // By default retry waits 100, 200 and 400ms, let's skip 700ms
    await vi.advanceTimersByTimeAsync(700);
    add(fakeMetric);
    unmount();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Should not flush after 9 sec', async () => {
    renderHook(() => useMetrics());
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(9000);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('Should not flush if metrics are empty', async () => {
    renderHook(() => useMetrics());
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('Should flush after 10 sec', async () => {
    renderHook(() => useMetrics());
    expect(onCLS).toHaveBeenCalled();
    expect(onLCP).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    add(fakeMetric);
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Should flush after 3 sec and 13sec, but not before 13sec', async () => {
    renderHook(() => useMetrics());
    expect(fetchMock).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(onCLS).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];
    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    add(fakeMetric);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Should flush retry once', async () => {
    renderHook(() => useMetrics());

    fetchMock.mockRejectedValueOnce(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Should increase size of metric when event called', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    expect(result.current?.metrics.current.size).toBe(0);
    add({ name: 'CLS' });
    expect(result.current?.metrics.current.size).toBe(1);
  });

  it('Should clean metrics after flush', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    expect(result.current?.metrics.current.size).toBe(0);
    for (let i = 0; i < 9; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current?.metrics.current.size).toBe(9);
    add({ name: 'CLS', i: 12 });
    expect(result.current?.metrics.current.size).toBe(0);
  });

  it('Should not call new flush before last is finished', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    fetchMock.mockRejectedValue(new Error('FAIL'));

    for (let i = 0; i < 10; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current?.metrics.current.size).toBe(0);
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current?.metrics.current.size).toBe(13);
    fetchMock.mockResolvedValue(createFetchResponse());
    await vi.advanceTimersByTimeAsync(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Call next retry
    add({ name: 'CLS', i: -1 });
    expect(result.current?.metrics.current.size).toBe(0);
  });

  it('Should flush after 10, and keep in memory rest', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current?.metrics.current.size).toBe(3);
  });
});

describe('Test useMetric retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetMocks();
  });

  it('Should stop working after 3 failures', async () => {
    const { result } = renderHook(() => useMetrics());

    fetchMock.mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current?.metrics.current.size).toBe(3);
    add({ name: 'CLS', i: -1 });
    await vi.advanceTimersByTimeAsync(700);
    expect(result.current?.metrics.current.size).toBe(4);

    add({ name: 'CLS', i: -1 });
    expect(result.current?.metrics.current.size).toBe(4);
  });

  it('Should retry after 100, 200, 400ms', async () => {
    renderHook(() => useMetrics());

    fetchMock.mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(199);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(399);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('Should have 3 retries after 700ms', async () => {
    renderHook(() => useMetrics());

    fetchMock.mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('Should stop interval on retries', async () => {
    renderHook(() => useMetrics());

    fetchMock.mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    fetchMock.mockResolvedValue(createFetchResponse());
    await vi.advanceTimersByTimeAsync(9300);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('Test useMetric, simple tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetMocks();
  });

  it('Should sample 70% of items', async () => {
    useConfigMock.mockReturnValueOnce({
      ...createConfig(),
      sampleRate: '0.3'
    });

    const { result } = renderHook(() => useMetrics());

    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });

    expect(result.current?.metrics.current.size).not.eq(9);
  });

  it('Should clean metrics in test', () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls?.[0]?.[0];
    add({ name: 'CLS' });
    expect(result.current?.metrics.current.size).to.be.eq(1);
    result.current?.metrics.current.clear();
    expect(result.current?.metrics.current.size).to.be.eq(0);
  });
});
