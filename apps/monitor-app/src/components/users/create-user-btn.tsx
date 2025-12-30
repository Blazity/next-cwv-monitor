"use client";

import { useState } from "react";
import { useForm, useController, FormProvider } from "react-hook-form";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useAction } from "next-safe-action/hooks";
import { UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomInput } from "@/components/custom-input";

import { createUserSchema } from "@/app/server/domain/users/create/types";
import { createUserAction } from "@/app/server/actions/users/create-user";

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  } catch {
    toast.error("Failed to copy!");
  }
};

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{result ? "Account Created" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {result
              ? "Save these credentials. The password will not be shown again."
              : "Fill in the details below to create a new account."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-4">
            {[
              { label: "Email", value: result.email },
              { label: "Password", value: result.password },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">{item.label}</Label>
                <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-2 px-3">
                  <code className="flex-1 font-mono text-sm font-semibold">{item.value}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(item.value, item.label)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
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

              <CustomInput {...register("email")} label="Email" type="email" placeholder="john@example.com" />

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
        )}
      </DialogContent>
    </Dialog>
  );
}
