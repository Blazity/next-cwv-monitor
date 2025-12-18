import { LoginForm } from '@/components/login-form';

export default async function LoginPage({
    searchParams,
  }: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl ?? '/projects'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
