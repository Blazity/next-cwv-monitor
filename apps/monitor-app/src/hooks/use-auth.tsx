'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setUser({
            id: session.data.user.id,
            name: session.data.user.name || session.data.user.email,
            email: session.data.user.email
          });
        }
      } catch (error) {
        console.error('Failed to get session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
