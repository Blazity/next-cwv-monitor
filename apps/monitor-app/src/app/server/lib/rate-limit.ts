import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

const DEFAULT_LIMIT = 1000;
const ONE_HOUR_SECONDS = 60 * 60;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RateLimiterOptions = {
  points?: number;
  durationSeconds?: number;
  blockDurationSeconds?: number;
};

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  reset(key?: string): Promise<void>;
}

export class MemoryRateLimiter implements RateLimiter {
  private limiter: RateLimiterMemory;
  private readonly points: number;
  private readonly durationSeconds: number;
  private readonly blockDurationSeconds: number;

  constructor(options: RateLimiterOptions = {}) {
    this.points = options.points ?? DEFAULT_LIMIT;
    this.durationSeconds = options.durationSeconds ?? ONE_HOUR_SECONDS;
    this.blockDurationSeconds = options.blockDurationSeconds ?? 0;

    this.limiter = new RateLimiterMemory({
      points: this.points,
      duration: this.durationSeconds,
      blockDuration: this.blockDurationSeconds
    });
  }

  async reset(key?: string) {
    if (key) {
      await this.limiter.delete(key);
    } else {
      this.limiter = new RateLimiterMemory({
        points: this.points,
        duration: this.durationSeconds,
        blockDuration: this.blockDurationSeconds
      });
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    try {
      const res = await this.limiter.consume(key, 1);
      return {
        ok: true,
        limit: this.points,
        remaining: Math.max(0, res.remainingPoints),
        resetAt: Date.now() + res.msBeforeNext
      };
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        return {
          ok: false,
          limit: this.points,
          remaining: 0,
          resetAt: Date.now() + error.msBeforeNext
        };
      }
      throw error;
    }
  }
}

export const ipRateLimiter = new MemoryRateLimiter();
