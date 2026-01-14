export const DEVICE_TYPES = ["desktop", "mobile"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEFAULT_DEVICE_TYPE: DeviceType = "desktop";

const MOBILE_HINTS = new Set(["mobile", "phone", "handset", "handheld", "tablet"]);
const DESKTOP_HINTS = new Set(["desktop", "pc", "laptop", "computer", "smarttv", "tv", "console"]);

export function coerceDeviceType(raw?: string | null): DeviceType | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "mobile" || MOBILE_HINTS.has(normalized)) {
    return "mobile";
  }
  if (normalized === "desktop" || DESKTOP_HINTS.has(normalized)) {
    return "desktop";
  }
  return undefined;
}
