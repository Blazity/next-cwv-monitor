"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useQueryParam(key: string, defaultValue = "") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(key) || defaultValue;

  const setValue = useCallback(
    (newValue: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === null || newValue === "") {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [key, pathname, router, searchParams]
  );

  return [value, setValue] as const;
}
