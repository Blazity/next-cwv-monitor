import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { auth } from '@/lib/auth';
import { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function LoginPageContent({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : (params.callbackUrl ?? '/projects');

  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (session) {
    redirect(callbackUrl as Route);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}

function LoginPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    </div>
  );
}

export default function LoginPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}
