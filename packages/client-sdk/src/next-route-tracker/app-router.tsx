import { useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useCWV } from '../cwv-context';
import { reconstructAppRouterRoute, type NextParams } from '../utils/next-route';
import { useIsomorphicLayoutEffect } from '../utils/use-isomorphic-layout-effect';

export function AppRouterRouteTracker(): null {
  const { runtime } = useCWV();
  const { _onViewChange } = runtime;

  const pathname = usePathname();
  const params = useParams() as unknown as NextParams;

  const route = useMemo(() => reconstructAppRouterRoute(pathname, params), [pathname, params]);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    _onViewChange({ route, path: window.location.pathname || pathname || '/' });
  }, [_onViewChange, pathname, route]);

  return null;
}
