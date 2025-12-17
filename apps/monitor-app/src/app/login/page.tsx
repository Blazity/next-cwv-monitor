'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/login-form';

function handleError(error: string) {
  console.error('Login error:', error);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/projects';

  const handleSuccess = () => {
    router.push(callbackUrl);
  };

  return <LoginForm onSuccess={handleSuccess} onError={handleError} />;
}
