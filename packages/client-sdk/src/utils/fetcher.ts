import type z from 'zod';
import { stringify } from 'qs';

interface Fetch<T extends z.ZodTypeAny> {
  schema: T;
  endpoint: `/${string}`;
  config?: Parameters<typeof fetch>[1];
  queryParams?: Record<string, string>;
}

export class Fetcher {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly abortTime?: number
  ) {}

  fetch = async <T extends z.ZodTypeAny>({ endpoint, queryParams, schema, config }: Fetch<T>) => {
    const params = stringify({ ...queryParams }, { addQueryPrefix: true });
    const fullUrl = `${this.apiUrl}${endpoint}${params}`;
    let abortController: AbortController | undefined;
    let abortTimeout: number | undefined;
    if (this.abortTime) {
      abortController = new AbortController();
      abortTimeout = setTimeout(() => {
        abortController?.abort();
      }, this.abortTime);
    }
    const response = await fetch(fullUrl, {
      keepalive: true,
      ...(abortController && { signal: abortController.signal }),
      ...config,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...config?.headers
      }
    });

    if (typeof abortTimeout !== 'undefined') {
      clearTimeout(abortTimeout);
    }
    // Never throw error to client
    if (!response.ok) {
      throw new Error('Failed to receive data');
    }

    const data: unknown = await response.json();
    const { success, data: parsedData } = schema.safeParse(data);
    if (!success) {
      return null;
    }
    return parsedData as z.output<T>;
  };
}
