import Image from 'next/image';
import { ErrorComponent } from './ErrorComponent';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white px-16 py-32 sm:items-start dark:bg-black">
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
        <h1>Demo app</h1>
        <ErrorComponent />
      </main>
    </div>
  );
}
