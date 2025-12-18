import { useEffect, useRef } from 'react';
import { useCWV } from '../cwv-context';
import { getFullPath, getNormalizedRoute } from '../utils/navigation';

const PAGE_VIEW_EVENT_NAME = '$page_view';

export function usePageViewTracking(): void {
  const { runtime } = useCWV();
  const { ingestQueue, rotateSessionId } = runtime;
  const lastTrackedRouteRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let originalPushState: History['pushState'] | undefined;
    let originalReplaceState: History['replaceState'] | undefined;

    const trackCurrentPageView = () => {
      const route = getNormalizedRoute();
      if (route === lastTrackedRouteRef.current) return;
      lastTrackedRouteRef.current = route;

      const sessionId = rotateSessionId();
      ingestQueue.primeCwvSamplingDecision(sessionId);

      ingestQueue.enqueueCustomEvent({
        name: PAGE_VIEW_EVENT_NAME,
        sessionId,
        route,
        path: getFullPath(),
        recordedAt: new Date().toISOString()
      });
    };

    const patchHistory = () => {
      if (typeof history === 'undefined') return;

      originalPushState = history.pushState.bind(history);
      history.pushState = (...args) => {
        originalPushState?.(...args);
        trackCurrentPageView();
      };

      originalReplaceState = history.replaceState.bind(history);
      history.replaceState = (...args) => {
        originalReplaceState?.(...args);
        trackCurrentPageView();
      };
    };

    const unpatchHistory = () => {
      if (typeof history === 'undefined') return;

      if (originalPushState) {
        history.pushState = originalPushState;
        originalPushState = undefined;
      }
      if (originalReplaceState) {
        history.replaceState = originalReplaceState;
        originalReplaceState = undefined;
      }
    };

    trackCurrentPageView();
    patchHistory();
    window.addEventListener('popstate', trackCurrentPageView, { capture: true });

    return () => {
      window.removeEventListener('popstate', trackCurrentPageView, { capture: true });
      unpatchHistory();
    };
  }, [ingestQueue, rotateSessionId]);
}
