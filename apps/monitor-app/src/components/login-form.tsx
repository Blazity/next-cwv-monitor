"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Route } from "next";
import { toast } from "sonner";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { loginAction } from "@/app/server/actions/users/login";
import { loginSchema } from "@/app/server/domain/users/login/types";

type LoginFormProps = {
  callbackUrl: Route;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const { form, action, handleSubmitWithAction } = useHookFormAction(loginAction, arktypeResolver(loginSchema), {
    actionProps: {
      onSuccess: () => {
        toast.success("Logged in. Redirecting...");
        globalThis.location.replace(callbackUrl);
      },
      onError: ({ error }) => {
        const message = error.serverError || "Login failed";
        form.setError("root", { type: "server", message });
      },
    },
    formProps: {
      mode: "onBlur",
      defaultValues: { email: "", password: "" },
    },
  });

  const {
    register,
    formState: { errors },
    clearErrors,
  } = form;

  const isLoading = action.isPending || form.formState.isSubmitting;
  const errorMessage = errors.root?.message || errors.email?.message || errors.password?.message;

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-md">
            <Activity className="text-primary-foreground h-5 w-5" />
          </div>
          <span className="text-foreground text-2xl font-semibold">CWV Monitor</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmitWithAction}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="text-destructive bg-destructive/10 border-destructive/20 animate-in fade-in zoom-in-95 flex items-start gap-2 rounded-md border p-3 text-sm duration-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="wrap-break-words block leading-tight whitespace-normal">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register("email", {
                    onChange: () => {
                      clearErrors("email");
                      clearErrors("root");
                    },
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register("password", {
                    onChange: () => {
                      clearErrors("password");
                      clearErrors("root");
                    },
                  })}
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="my-4 mt-4 mb-0 w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
