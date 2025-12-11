import { betterAuth } from 'better-auth';
import { env } from '@/env';
import { clickHouseAdapter } from './clickhouse-adapter';

const MIN_PASSWORD_LENGTH = 8;

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.CLIENT_APP_ORIGIN,
  database: clickHouseAdapter({ debugLogs: env.CLICKHOUSE_DEBUG_LOGS }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours (auto-refresh)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  },
  rateLimit: {
    enabled: true,
    window: RATE_LIMIT_WINDOW,
    max: MAX_LOGIN_ATTEMPTS,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },
});