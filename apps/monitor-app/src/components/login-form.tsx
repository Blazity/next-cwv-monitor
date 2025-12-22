'use client';

import { useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { Activity, AlertCircle } from 'lucide-react';
import { type as arkType } from 'arktype';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = arkType({
  email: arkType('string.email').describe("a valid email address").configure({ actual: () => "" }),
  password: arkType('string >= 1').configure({ actual: () => "" })
});

type LoginFormData = typeof loginSchema.infer;

type LoginFormProps = {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: arktypeResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onSubmit',
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const errorMessage = 
    errors.root?.message || 
    errors.email?.message || 
    errors.password?.message;

  const onSubmit = async (data: LoginFormData) => {
    
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: callbackUrl,
    });

    if (error) {
      setError('root', { 
        type: 'server',
        message: error.message || 'Login failed' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

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

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 animate-in fade-in zoom-in-95 duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="block break-words whitespace-normal leading-tight">
                      {errorMessage}
                    </span>
                  </div>
                )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('email', {onChange: () => {
                    clearErrors('email');
                    clearErrors('root');
                  }})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...register('password', {onChange: () => {
                    clearErrors('password');
                    clearErrors('root');
                  }})}
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full my-4 mb-0 mt-4" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}