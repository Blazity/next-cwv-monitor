import { LoginForm } from '@/components/login-form';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function LoginPage({
    searchParams,
  }: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl ?? '/projects'

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (session) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
