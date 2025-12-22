export type MockNextRouter = {
  pathname?: string;
  isReady?: boolean;
  events?: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    off: (event: string, cb: (...args: unknown[]) => void) => void;
  };
};

let currentRouter: Required<MockNextRouter> = {
  pathname: '/',
  isReady: true,
  events: {
    on: () => {},
    off: () => {}
  }
};

export function __setMockRouter(router: MockNextRouter): void {
  currentRouter = {
    pathname: router.pathname ?? currentRouter.pathname,
    isReady: router.isReady ?? currentRouter.isReady,
    events: router.events ?? currentRouter.events
  };
}

// This is a minimal test stub for the SDK's Next integration.
export function useRouter(): Required<MockNextRouter> {
  return currentRouter;
}


