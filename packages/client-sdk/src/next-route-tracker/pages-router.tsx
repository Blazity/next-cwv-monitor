import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCWV } from '../cwv-context';
import { useIsomorphicLayoutEffect } from '../utils/use-isomorphic-layout-effect';

export function PagesRouterRouteTracker(): null {
  const { runtime } = useCWV();
  const { _onViewChange } = runtime;

  const router = useRouter();

  const route = router.pathname || '/';

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!router.isReady) return;
    _onViewChange({ route, path: window.location.pathname || '/' });
  }, [_onViewChange, router.isReady, route]);

  useEffect(() => {
    if (!router.events) return;

    const track = () => {
      _onViewChange({ route: router.pathname || '/', path: window.location.pathname || '/' });
    };

    // Initial page view (Next Pages Router doesn't emit routeChangeComplete on first load)
    if (router.isReady) {
      track();
    }

    router.events.on('routeChangeComplete', track);

    return () => {
      router.events.off('routeChangeComplete', track);
    };
  }, [_onViewChange, router]);

  return null;
}
