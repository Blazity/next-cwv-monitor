'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/src/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Check if already authenticated
    const checkSession = async () => {
      try {
        const { data: session } = await authClient.getSession();
        if (session) {
          router.replace('/dashboard');
          return;
        }
        
        // Check if setup is required
        const response = await fetch('/api/auth/setup-check');
        const setupData = await response.json();
        
        if (setupData.requiresSetup) {
          router.replace('/setup');
          return;
        }
      } catch {
        // Continue to login page
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        // Handle rate limiting
        if (result.error.status === 429) {
          const retryAfter = result.error.message?.match(/\d+/)?.[0] || '60';
          setError(`Too many login attempts. Please try again in ${retryAfter} seconds.`);
          setAttemptsRemaining(0);
        } else {
          setError(result.error.message || 'Invalid email or password');
          // Update remaining attempts if provided
          if (result.error.message?.includes('attempts remaining')) {
            const match = result.error.message.match(/(\d+) attempts remaining/);
            if (match) {
              setAttemptsRemaining(parseInt(match[1], 10));
            }
          }
        }
      } else {
        // Successful login - redirect to dashboard
        router.push('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CWV Monitor
          </h1>
          <p className="mt-2 text-zinc-400">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={8}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="mt-1 text-xs text-red-400/70">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || attemptsRemaining === 0}
              className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Core Web Vitals monitoring dashboard
        </p>
      </div>
    </div>
  );
}

