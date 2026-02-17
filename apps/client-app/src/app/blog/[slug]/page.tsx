import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemoShell } from '../../../components/shared/demo-shell';
import { BLOG_POSTS, getBlogPost } from '../_posts';
import SubscribeButton from '@/src/components/app-router/subscribe-button';

export function generateStaticParams() {
  // Keeps the demo predictable and gives you a nice set of slugs to click through.
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <DemoShell>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <div>
          <header className="flex flex-col gap-6">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-300">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <Link href="/blog" className="hover:underline">
                Blog
              </Link>
              <SubscribeButton name="subscribe">
                Subscribe
              </SubscribeButton>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-zinc-950 dark:text-zinc-50">{post.slug}</span>
            </nav>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {post.readingTime}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-300">{post.publishedAt}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">•</span>
                <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 font-mono text-xs text-zinc-700 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-950/80 dark:text-zinc-200">
                  /blog/[slug]
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
              <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">{post.excerpt}</p>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-sky-500/20 via-fuchsia-500/15 to-emerald-500/15 blur-2xl" />
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                {/* Large above-the-fold image: commonly becomes the LCP candidate. */}
                <Image src={post.heroSrc} alt={post.heroAlt} fill priority sizes="100vw" className="object-cover" />
              </div>
            </div>
          </header>

          <article className="mt-10 space-y-7">
            {post.content.map((block, idx) => {
              if (block.type === 'h2') {
                return (
                  <h2 key={idx} className="text-xl font-semibold tracking-tight">
                    {block.text}
                  </h2>
                );
              }
              return (
                <p key={idx} className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  {block.text}
                </p>
              );
            })}
          </article>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">More navigation</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Jump between slugs to ensure <span className="font-mono">path</span> changes while{' '}
              <span className="font-mono">route</span> stays parameterized.
            </p>

            <div className="mt-4 grid gap-2">
              {BLOG_POSTS.filter((p) => p.slug !== post.slug).map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {p.title}
                </Link>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 bg-white/60 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </DemoShell>
  );
}
