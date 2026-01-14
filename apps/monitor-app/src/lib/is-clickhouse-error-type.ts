import { isObject } from "@/lib/utils";

type KnownClickhouseErrors = "CANNOT_PARSE_UUID" | "TYPE_MISMATCH";

export function isClickhouseErrorType(error: unknown, type: [KnownClickhouseErrors, ...KnownClickhouseErrors[]]) {
  if (!(error instanceof Error)) return false;
  if (!isObject(error.cause) || !("type" in error.cause) || typeof error.cause.type !== "string") return false;
  return type.includes(error.cause.type as KnownClickhouseErrors);
}
