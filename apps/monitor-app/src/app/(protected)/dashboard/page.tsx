import { headers } from 'next/headers';
import { auth } from '@/src/lib/auth';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
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
            <h1 className="text-xl font-bold text-white">CWV Monitor</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                <p className="text-xs text-zinc-500">{session?.user?.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome Card */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-8">
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {session?.user?.name?.split(' ')[0]}!
          </h2>
          <p className="mt-2 text-zinc-400">
            Monitor your Core Web Vitals performance across all your pages.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'LCP', value: '--', unit: 'ms', color: 'emerald' },
            { label: 'FID', value: '--', unit: 'ms', color: 'blue' },
            { label: 'CLS', value: '--', unit: '', color: 'amber' },
            { label: 'TTFB', value: '--', unit: 'ms', color: 'violet' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {stat.value}
                {stat.unit && <span className="ml-1 text-lg text-zinc-500">{stat.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No metrics yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Install the CWV Monitor SDK on your client application to start collecting metrics.
          </p>
          <button className="mt-6 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700">
            View Setup Guide
          </button>
        </div>
      </main>
    </div>
  );
}

