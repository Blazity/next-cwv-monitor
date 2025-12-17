'use client';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Welcome to CWV Monitor</h1>
          <p className="text-muted-foreground mb-8">
            Monitor Core Web Vitals for your web applications
          </p>
        </div>
      </main>
    </div>
  );
}
