export function toQuantileSummary(
  values: number[] | undefined
): { p50: number; p75: number; p90: number; p95: number; p99: number } | null {
  if (!values || values.length < 5) {
    return null;
  }

  return {
    p50: values[0],
    p75: values[1],
    p90: values[2],
    p95: values[3],
    p99: values[4]
  };
}
