import type { BetterAuthPlugin } from "better-auth";

export function nextCookies(): BetterAuthPlugin {
  return {
    id: "next-cookies-test-stub",
  } as BetterAuthPlugin;
}
