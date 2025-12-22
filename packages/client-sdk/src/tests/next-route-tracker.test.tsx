import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { __setMockPathname, __setMockParams } from './__mocks__/next-navigation';
import { __setMockRouter } from './__mocks__/next-router';

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

import { onCLS } from 'web-vitals';
import { CWVMonitor as AppRouterCWVMonitor } from '../app-router';
import { CWVMonitor as PagesRouterCWVMonitor } from '../pages-router';

describe('Next router entrypoints', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(createFetchResponse());

    __setMockPathname('/');
    __setMockParams({});
    __setMockRouter({ pathname: '/', isReady: true, events: { on: vi.fn(), off: vi.fn() } });

    window.history.pushState({}, '', '/');
  });

  it('App Router: attaches normalized route and concrete path', async () => {
    __setMockPathname('/blog/hello-world');
    __setMockParams({ slug: 'hello-world' });
    window.history.pushState({}, '', '/blog/hello-world');

    render(<AppRouterCWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={1} />);

    // `$page_view` auto-tracked
    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const pageView = body?.customEvents?.[0];
    expect(pageView?.name).toBe('$page_view');
    expect(pageView?.route).toBe('/blog/[slug]');
    expect(pageView?.path).toBe('/blog/hello-world');

    fetchMock.mockClear();

    const add = (onCLS as Mock).mock.calls[0]?.[0];
    add({ name: 'CLS', value: 1, rating: 'good' });

    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body2 = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body2?.events?.[0]?.route).toBe('/blog/[slug]');
    expect(body2?.events?.[0]?.path).toBe('/blog/hello-world');
  });

  it('Pages Router: uses router.pathname as the normalized route template', async () => {
    __setMockRouter({ pathname: '/blog/[slug]', isReady: true, events: { on: vi.fn(), off: vi.fn() } });
    window.history.pushState({}, '', '/blog/hello-world');

    render(<PagesRouterCWVMonitor endpoint="https://monitor-app.test" projectId="test-project" sampleRate={1} />);

    await vi.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const pageView = body?.customEvents?.[0];
    expect(pageView?.name).toBe('$page_view');
    expect(pageView?.route).toBe('/blog/[slug]');
    expect(pageView?.path).toBe('/blog/hello-world');
  });
});
