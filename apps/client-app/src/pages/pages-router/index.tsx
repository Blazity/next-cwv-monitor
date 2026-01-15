import Link from 'next/link';
import { DemoShell } from '../../components/shared/demo-shell';
import CustomEventButton from '@/src/components/pages-router/custom-event-button';

export default function PagesRouterIndexPage() {
  return (
    <DemoShell>
      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-[2rem] border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pages Router demo</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
            These routes are rendered from <span className="font-mono">src/pages</span> and use the SDK entrypoint{' '}
            <span className="font-mono">next-cwv-monitor/pages-router</span>.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pages-router/blog"
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Go to pages blog
            </Link>
            <Link
              href="/pages-router/sub-page"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Go to sub page
            </Link>

            <CustomEventButton eventName="Subscribe" name="subscribe">
              Subscribe
            </CustomEventButton>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What to verify</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
            <li>
              <span className="font-mono">route</span> should be the template (e.g.{' '}
              <span className="font-mono">/pages-router/blog/[slug]</span>)
            </li>
            <li>
              <span className="font-mono">path</span> should be the concrete URL (e.g.{' '}
              <span className="font-mono">/pages-router/blog/hello-world</span>)
            </li>
            <li>Session id rotates on every page view</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            Want to compare App Router behavior? Visit{' '}
            <Link href="/blog" className="underline">
              /blog
            </Link>
            .
          </div>
        </div>
      </section>
    </DemoShell>
  );
}
