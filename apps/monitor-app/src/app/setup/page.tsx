'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/src/lib/auth-client';

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to create admin account');
      } else {
        // Auto sign-in after successful setup
        const signInResult = await authClient.signIn.email({
          email,
          password,
        });

        if (signInResult.error) {
          // Account created but sign-in failed, redirect to login
          router.push('/login');
        } else {
          // Redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome to CWV Monitor
          </h1>
          <p className="mt-2 text-zinc-400">
            Create your admin account to get started
          </p>
        </div>

        {/* Setup Form */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
          <form onSubmit={handleSetup} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="John Doe"
              />
            </div>

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
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="admin@example.com"
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
                minLength={8}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Min 8 characters, with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                  Creating Account...
                </span>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          This will create the first administrator account for your CWV Monitor instance.
        </p>
      </div>
    </div>
  );
}

