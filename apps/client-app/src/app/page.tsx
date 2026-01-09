import Image from 'next/image';
import Link from 'next/link';
import { DemoShell } from '../components/shared/demo-shell';
import CustomEventButton from '../components/app-router/custom-event-button';

export default function Home() {
  return (
    <DemoShell>
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-950/80 dark:text-zinc-200">
              App Router demo
            </span>
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-950/80 dark:text-zinc-200">
              Dynamic routes
            </span>
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-950/80 dark:text-zinc-200">
              LCP/CLS/INP ready
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              A realistic playground for CWV tracking
            </h1>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
              Navigate between <span className="font-mono">/blog/[slug]</span> pages to validate route normalization.
              The hero image is intentionally large to surface LCP candidates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Explore the blog
            </Link>
            <a
              href="https://web.dev/metrics/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              CWV docs
            </a>

            <CustomEventButton eventName='Subscribe' name='subscribe'>Subscribe</CustomEventButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">What to verify</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                <li>
                  <span className="font-mono">route</span> stays <span className="font-mono">/blog/[slug]</span>
                </li>
                <li>
                  <span className="font-mono">path</span> changes per slug
                </li>
                <li>Page views rotate session id</li>
                <li>Click on custom event button sends custom event payload</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Tips</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                <li>Use Chrome to see LCP/CLS/INP reliably</li>
                <li>Open devtools console for SDK logs</li>
                <li>Navigate between slugs a few times</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-sky-500/20 via-fuchsia-500/15 to-emerald-500/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="relative aspect-[16/9] w-full">
              <Image src="/cwv-hero.svg" alt="CWV demo hero" fill priority sizes="100vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Image className="dark:invert" src="/next.svg" alt="Next.js" width={90} height={20} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-300">Next 16 • App Router</span>
                </div>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  LCP candidate
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Link
                  href="/blog/hello-world"
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  hello-world
                </Link>
                <Link
                  href="/blog/lcp-playground"
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  lcp-playground
                </Link>
                <Link
                  href="/blog/routing-and-metrics"
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  routing-and-metrics
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </DemoShell>
  );
}
