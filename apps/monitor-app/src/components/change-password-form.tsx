"use client";

import { useForm } from "react-hook-form";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/app/server/actions/users/change-password";
import { type Route } from "next";
import { ChangePasswordData, changePasswordSchema } from "@/app/server/domain/users/change-password/types";

export function ChangePasswordForm({ callbackUrl }: { callbackUrl: Route }) {
  const router = useRouter();

  const { execute, isPending, result } = useAction(changePasswordAction, {
    onSuccess: async () => {
      router.push(callbackUrl);
      router.refresh();
    },
    onError: ({ error }) => {
      if (error.validationErrors) {
        for (const [key, messages] of Object.entries(error.validationErrors)) {
          setError(key as keyof ChangePasswordData, {
            type: "server",
            message: messages.length > 0 ? messages[0] : "Invalid input",
          });
        }
      }

      if (error.serverError) {
        setError("root", {
          type: "server",
          message: error.serverError,
        });
      }
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: arktypeResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Your admin has reset your password. Please set a new one to continue.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(execute)}>
        <CardContent className="space-y-4">
          {result.serverError && (
            <div className="bg-destructive/10 text-destructive flex gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="h-4 w-4" />
              {result.serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-destructive text-xs">{errors.currentPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-destructive text-xs">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
