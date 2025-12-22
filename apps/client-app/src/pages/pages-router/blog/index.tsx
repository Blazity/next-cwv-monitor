import Image from 'next/image';
import Link from 'next/link';
import { DemoShell } from '../../../app/_components/demo-shell';
import { BLOG_POSTS } from '../../../app/blog/_posts';

export default function PagesRouterBlogIndexPage() {
  return (
    <DemoShell>
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-300">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <Link href="/pages-router" className="hover:underline">
                Pages Router
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-zinc-950 dark:text-zinc-50">Blog</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pages Router blog</h1>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
              Each post lives under <span className="font-mono">/pages-router/blog/[slug]</span>. Navigate between slugs
              to validate route templates from <span className="font-mono">next/router</span>.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-sky-500/20 via-fuchsia-500/15 to-emerald-500/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="relative aspect-[16/9] w-full">
                <Image src="/cwv-hero.svg" alt="" fill className="object-cover" priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/pages-router/blog/${post.slug}`}
            className="group relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/70"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {post.readingTime}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-300">{post.publishedAt}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">•</span>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-300">/pages-router/blog/{post.slug}</span>
                </div>

                <h2 className="text-lg font-semibold tracking-tight group-hover:underline">{post.title}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{post.excerpt}</p>
              </div>

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <Image src={post.heroSrc} alt="" fill className="object-cover opacity-95" />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </DemoShell>
  );
}

