"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Credentials = {
  email: string;
  password?: string;
};

type CredentialsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  successTitle?: string;
  successDescription?: string;
  result: Credentials | null;
  children: React.ReactNode;
};

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  } catch {
    toast.error("Failed to copy!");
  }
};

export function CredentialsDialog({
  open,
  onOpenChange,
  title,
  description,
  successTitle = "Credentials Created",
  successDescription = "Save these credentials. The password will not be shown again.",
  result,
  children,
}: CredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{result ? successTitle : title}</DialogTitle>
          <DialogDescription>{result ? successDescription : description}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-4">
            {[
              { label: "Email", value: result.email },
              { label: "Password", value: result.password },
            ].map(
              (item) =>
                item.value && (
                  <div key={item.label} className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">{item.label}</Label>
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-2 px-3">
                      <code className="flex-1 font-mono text-sm font-semibold">{item.value}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(item.value!, item.label)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ),
            )}
            <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
