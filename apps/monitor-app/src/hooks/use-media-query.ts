"use client";

import { useSyncExternalStore } from "react";

const getServerSnapshot = () => {
  return false;
};

export function useMediaQuery(query: string) {
  const subscribe = (callback: () => void) => {
    const matchMedia = globalThis.matchMedia(query);
    matchMedia.addEventListener("change", callback);
    return () => matchMedia.removeEventListener("change", callback);
  };

  const getSnapshot = () => {
    return globalThis.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
