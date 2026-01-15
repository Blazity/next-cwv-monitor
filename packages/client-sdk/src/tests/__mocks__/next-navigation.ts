export type MockNextParams = Record<string, string | string[]>;

let currentPathname = '/';
let currentParams: MockNextParams = {};

export function __setMockPathname(pathname: string): void {
  currentPathname = pathname;
}

export function __setMockParams(params: MockNextParams): void {
  currentParams = params;
}

// This is a minimal test stub for the SDK's Next integration.
export function usePathname(): string {
  return currentPathname;
}

export function useParams(): MockNextParams {
  return currentParams;
}
