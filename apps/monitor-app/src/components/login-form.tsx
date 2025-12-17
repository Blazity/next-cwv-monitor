'use client';

import * as React from 'react';
import { Activity } from 'lucide-react';
import { type as arkType } from 'arktype';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = arkType({
  email: 'string.email',
  password: 'string >= 1'
});

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const formValues = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const validation = loginSchema(formValues);
    if (validation instanceof arkType.errors) {
      const message = 'summary' in validation ? validation.summary : `${validation}`;
      setErrorMessage(message);
      setIsLoading(false);
      return;
    }

    try {
        const { error } = await authClient.signIn.email({
          email: validation.email,
          password: validation.password,
        });
      
        if (error) {
          const message = error.message || 'Unexpected error';
          setErrorMessage(message);
          onError?.(message);
          return;
        }
      
        onSuccess?.();
      } catch (error) {
        console.error("Unexpected crash:", error);
        setErrorMessage('Unexpected error');
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-semibold text-foreground">CWV Monitor</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  type="email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>

              {errorMessage && (
                <div className="text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full my-4 mb-0 mt-4" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 p-4 rounded-md border border-border bg-muted/50">
          <p className="text-sm text-muted-foreground text-center mb-2">Demo credentials:</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">Admin:</span> admin@example.com / admin123</p>
            <p><span className="font-medium">User:</span> user@example.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
