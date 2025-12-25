import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { env } from '@/env';
import { clickHouseAdapter } from '@/lib/clickhouse-adapter';
import { nextCookies } from 'better-auth/next-js';
import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';

export const adminAuth = createAuthClient({
  plugins: [adminClient()]
});

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.CLIENT_APP_ORIGIN,
  database: clickHouseAdapter({ debugLogs: env.CLICKHOUSE_ADAPTER_DEBUG_LOGS }),
  user: {
    fields: {
      emailVerified: 'email_verified',
      role: 'role',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours (auto-refresh)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    },
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      userId: 'user_id'
    }
  },
  account: {
    fields: {
      accountId: 'account_id',
      providerId: 'provider_id',
      userId: 'user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  verification: {
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  plugins: [nextCookies(), admin()],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  },
  rateLimit: {
    enabled: true,
    window: env.RATE_LIMIT_WINDOW_MS,
    max: env.MAX_LOGIN_ATTEMPTS
  },
  emailAndPassword: {
    enabled: true,
    // TODO: Enable
    requireEmailVerification: false,
    password: {
      async hash(password: string) {
        /* FIXME: this should be moved to account creation/password change logic */
        /*
        const validation = validatePasswordStrength(password);
        if (!validation.valid) {
          throw new Error(validation.message);
        }
        */
        const { hashPassword } = await import('better-auth/crypto');
        return hashPassword(password);
      }
    }
  }
});

export type AdminApiResult<T extends keyof typeof auth.api> = Awaited<ReturnType<(typeof auth.api)[T]>>;
