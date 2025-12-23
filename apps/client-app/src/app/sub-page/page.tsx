import Link from 'next/link';
import { DemoShell } from '../_components/demo-shell';

export default function SubPage() {
  return (
    <DemoShell>
      <section className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div className="rounded-[2rem] border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
          <h2 className="text-2xl font-semibold tracking-tight">Subpage</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            A simple static route you can click to generate navigation events and sanity check page-view tracking.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              ← Back home
            </Link>
            <Link
              href="/blog"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Go to blog
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What to watch for</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
            <li>A `$page_view` custom event should be enqueued on navigation.</li>
            <li>Session id should rotate per view.</li>
            <li>Vulnerable to browser support: Safari will miss LCP.</li>
          </ul>
        </div>
      </section>
    </DemoShell>
  );
}
