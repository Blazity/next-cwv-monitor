export const timeRanges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' }
] as const;

export type AvailableRange = (typeof timeRanges)[number]['value'];

export function isValidTimeRange(value: string | string[] | undefined): value is AvailableRange {
  if (!value || Array.isArray(value)) return false;
  return timeRanges.some((range) => range.value === value);
}
