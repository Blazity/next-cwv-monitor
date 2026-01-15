import { describe, expect, it } from 'vitest';
import { reconstructAppRouterRoute } from '../utils/next-route';

describe('reconstructAppRouterRoute()', () => {
  it('returns "/" for the root path', () => {
    expect(reconstructAppRouterRoute('/', {})).toBe('/');
  });

  it('replaces a scalar param segment with [param]', () => {
    expect(reconstructAppRouterRoute('/blog/hello-world', { slug: 'hello-world' })).toBe('/blog/[slug]');
  });

  it('replaces a catch-all param slice with [...param]', () => {
    expect(reconstructAppRouterRoute('/docs/nextjs/routing', { slug: ['nextjs', 'routing'] })).toBe('/docs/[...slug]');
  });

  it('falls back to the concrete pathname when no params match', () => {
    expect(reconstructAppRouterRoute('/about', { slug: 'hello-world' })).toBe('/about');
  });
});
