"use client";

import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/app/server/actions/users/change-password";
import { type Route } from "next";
import { changePasswordSchema } from "@/app/server/domain/users/change-password/types";
import { toast } from "sonner";

export function ChangePasswordForm({ callbackUrl }: { callbackUrl: Route }) {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    changePasswordAction,
    arktypeResolver(changePasswordSchema),
    {
      actionProps: {
        onSuccess: async () => {
          toast.success("Password updated successfully");
          globalThis.location.replace(callbackUrl);
        },
        onError: ({ error }) => {
          if (error.serverError) {
            form.setError("root", {
              type: "server",
              message: error.serverError,
            });
          }
        },
      },
      formProps: {
        defaultValues: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
      },
      errorMapProps: {
        joinBy: ", ",
      },
    },
  );

  const {
    register,
    formState: { errors },
  } = form;
  const isLoading = action.isPending || form.formState.isSubmitting;
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Your admin has reset your password. Please set a new one to continue.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmitWithAction}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="bg-destructive/10 text-destructive flex gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="h-4 w-4" />
              {errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("currentPassword")}
            />
            {errors.currentPassword && <p className="text-destructive text-xs">{errors.currentPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              autoComplete="new-password"
              disabled={isLoading}
              type="password"
              {...register("newPassword")}
            />
            {errors.newPassword && <p className="text-destructive text-xs">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
