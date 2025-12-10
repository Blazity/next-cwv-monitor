import { betterAuth } from 'better-auth';
import bcrypt from 'bcrypt';
import { env } from '../env';
import { clickHouseAdapter } from './clickhouse-adapter';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_LOGIN_ATTEMPTS = 5; // Max attempts per window

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  database: clickHouseAdapter({ debugLogs: true }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours (auto-refresh)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache session for 5 minutes
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax', // CSRF protection
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  },
  rateLimit: {
    enabled: true,
    window: RATE_LIMIT_WINDOW,
    max: MAX_LOGIN_ATTEMPTS,
    // Custom storage for rate limiting (in-memory by default)
    // For production, consider using Redis
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    password: {
      hash: async (password) => {
        return bcrypt.hash(password, SALT_ROUNDS);
      },
      verify: async ({ password, hash }) => {
        return bcrypt.compare(password, hash);
      },
    },
  },
});