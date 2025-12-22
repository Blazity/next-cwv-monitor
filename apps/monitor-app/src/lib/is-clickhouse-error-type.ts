import { isObject } from '@/lib/utils';

type KnownClickhouseErrors = 'CANNOT_PARSE_UUID';

export function isClickhouseErrorType(error: unknown, type: KnownClickhouseErrors) {
  if (!(error instanceof Error)) return false;
  if (!isObject(error.cause) || !('type' in error.cause)) return false;
  return error.cause.type === type;
}
