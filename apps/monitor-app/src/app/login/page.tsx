import { LoginForm } from '@/components/login-form';

export default async function LoginPage({
    searchParams,
  }: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
    const params = await searchParams;
  const callbackUrl = (params.callbackUrl as string) || '/projects';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
