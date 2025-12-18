'use client';

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useLogout() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const logout = async () => {
    setIsPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.refresh(); 
            router.push("/login");
          },
        },
      });
    } catch {
      setIsPending(false);
    }
  };

  return {
    logout,
    isPending,
  };
}