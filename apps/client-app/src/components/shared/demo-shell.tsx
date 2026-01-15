import Image from 'next/image';
import Link from 'next/link';

type DemoShellProps = {
  children: React.ReactNode;
};

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
    >
      {children}
    </Link>
  );
};

export function DemoShell({ children }: DemoShellProps) {
  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-fuchsia-500/15 to-emerald-500/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_62%)]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <Image src="/cwv-hero.svg" alt="" fill className="object-cover opacity-90" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">CWV Monitor</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-300">Client SDK demo</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/blog">Blog</NavLink>
            <NavLink href="/sub-page">Subpage</NavLink>
            <NavLink href="/pages-router">Pages Router</NavLink>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 py-10">{children}</main>

      <footer className="relative border-t border-zinc-200/60 py-10 text-center text-xs text-zinc-500 dark:border-zinc-800/70 dark:text-zinc-300">
        <div className="mx-auto max-w-6xl px-6">
          <p>Tip: open the console to see SDK debug logs in dev; use Chrome to observe LCP/CLS/INP more reliably.</p>
        </div>
      </footer>
    </div>
  );
}
