import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn()
}));
const fetchMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock('../context/config/config.context', () => ({
  useConfig: () => ({
    fetcher: {
      fetch: fetchMock
    }
  })
}));

import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

import { useMetrics } from '../hooks/use-metrics';
import { onCLS } from 'web-vitals';
import { useConfig } from '../context/config/config.context';

const Layout: React.FC = () => {
  return <div>Hello world!</div>;
};

describe('Test useMetric hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('Should render app', () => {
    render(<Layout />);
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  it('Should flush immediatly when 10 in que', async () => {
    renderHook(() => useMetrics());

    expect(onCLS).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];

    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });

    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
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

    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    unmount();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
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

    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);

    // By default retry waits 100, 200 and 400ms, let's skip 700ms
    await vi.advanceTimersByTimeAsync(700);
    unmount();
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);
  });

  it('Should not flush after 9 sec', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(9000);
    expect(fetcher.fetch).toHaveBeenCalledTimes(0);
  });

  it('Should flush after 10 sec', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
  });

  it('Should flush after 3 sec and 13sec, but not before 13sec', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();
    expect(fetcher.fetch).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(onCLS).toHaveBeenCalled();

    const fakeMetric = { name: 'CLS', value: 1 };
    const add = (onCLS as Mock).mock.calls[0]?.[0];
    expect(typeof add).toBe('function');
    act(() => {
      for (let i = 0; i < 10; i++) add({ ...fakeMetric, i });
    });
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);
  });

  it('Should flush retry once', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();

    (fetcher.fetch as Mock).mockRejectedValueOnce(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls[0][0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(400);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);
  });

  it('Should retry after 100, 200, 400ms', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();

    (fetcher.fetch as Mock).mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls[0][0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(199);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher.fetch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(399);
    expect(fetcher.fetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher.fetch).toHaveBeenCalledTimes(4);
  });

  it('Should have 3 retries after 700ms', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();

    (fetcher.fetch as Mock).mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls[0][0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(fetcher.fetch).toHaveBeenCalledTimes(4);
  });

  it('Should not stop interval on retries', async () => {
    renderHook(() => useMetrics());
    const { fetcher } = useConfig();

    (fetcher.fetch as Mock).mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls[0][0];
    act(() => {
      for (let i = 0; i < 10; i++) add({ name: 'CLS', i });
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(fetcher.fetch).toHaveBeenCalledTimes(4);

    (fetcher.fetch as Mock).mockResolvedValue({ ok: true });
    await vi.advanceTimersByTimeAsync(9300);
    expect(fetcher.fetch).toHaveBeenCalledTimes(5);
  });

  it('Should increase size of metric when event called', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls[0][0];
    expect(result.current.metrics.current.size).toBe(0);
    add({ name: 'CLS' });
    expect(result.current.metrics.current.size).toBe(1);
  });

  it('Should clean metrics after flush', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls[0][0];
    expect(result.current.metrics.current.size).toBe(0);
    for (let i = 0; i < 9; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current.metrics.current.size).toBe(9);
    add({ name: 'CLS', i: 12 });
    expect(result.current.metrics.current.size).toBe(0);
  });

  it('Should not call new flush before last is finished', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls[0][0];
    const { fetcher } = useConfig();
    (fetcher.fetch as Mock).mockRejectedValue(new Error('FAIL'));

    for (let i = 0; i < 10; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current.metrics.current.size).toBe(0);
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current.metrics.current.size).toBe(13);
    (fetcher.fetch as Mock).mockResolvedValue({ ok: true });
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher.fetch).toHaveBeenCalledTimes(2);

    // Call next retry
    add({ name: 'CLS', i: -1 });
    expect(result.current.metrics.current.size).toBe(0);
  });

  it('Should flush after 10, and keep in memory rest', async () => {
    const { result } = renderHook(() => useMetrics());
    const add = (onCLS as Mock).mock.calls[0][0];
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current.metrics.current.size).toBe(3);
  });

  it('Should return metrics to stock after failed retries', async () => {
    const { result } = renderHook(() => useMetrics());
    const { fetcher } = useConfig();

    (fetcher.fetch as Mock).mockRejectedValue(new Error('FAIL'));
    const add = (onCLS as Mock).mock.calls[0][0];
    for (let i = 0; i < 13; i++) {
      add({ name: 'CLS', i });
    }
    expect(result.current.metrics.current.size).toBe(3);
    add({ name: 'CLS', i: -1 });
    await vi.advanceTimersByTimeAsync(700);
    expect(result.current.metrics.current.size).toBe(14);
  });
});
