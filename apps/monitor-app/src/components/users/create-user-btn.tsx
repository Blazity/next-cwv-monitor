"use client";

import { useState } from "react";
import { useForm, useController, FormProvider } from "react-hook-form";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useAction } from "next-safe-action/hooks";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { CustomInput } from "@/components/custom-input";
import { CredentialsDialog } from "@/components/users/credentials-dialog";

import { createUserSchema } from "@/app/server/domain/users/create/types";
import { createUserAction } from "@/app/server/actions/users/create-user";

export function CreateUserBtn() {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const methods = useForm({
    resolver: arktypeResolver(createUserSchema),
    mode: "onChange",
    defaultValues: { email: "", name: "", role: "member" as const },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = methods;

  const { field: roleField } = useController({ control, name: "role" });

  const { execute, isPending } = useAction(createUserAction, {
    onSuccess: ({ data }) => {
      toast.success("User created successfully!");
      setResult({ email: data.email, password: data.password });
      reset();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to create user. Please try again.");
    },
  });

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setResult(null);
      reset();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Create User
      </Button>

      <CredentialsDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        title="Create New User"
        description="Fill in the details below to create a new account."
        successTitle="Account Created"
        successDescription="Save these credentials. The password will not be shown again."
        result={result}
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit((data) => execute(data))} className="space-y-4">
            <CustomInput
              {...register("name")}
              label="Name"
              type="text"
              placeholder="John Doe"
              autoComplete="off"
              data-1p-ignore
            />

            <CustomInput 
              {...register("email")} 
              label="Email" 
              type="email" 
              placeholder="john@example.com" 
            />

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleField.value} onValueChange={roleField.onChange}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isPending}>
                {isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </CredentialsDialog>
    </>
  );
}