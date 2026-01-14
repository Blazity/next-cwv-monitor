"use client";

import { AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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
  const [isVisible, setIsVisible] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) setIsVisible(false);
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{result ? successTitle : title}</DialogTitle>
          <DialogDescription className={result ? "text-destructive/90 font-medium" : ""}>
            {result && <AlertTriangle className="mr-1 inline-block h-4 w-4 align-text-top" />}
            {result ? successDescription : description}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Email Address
              </Label>
              <div className="relative">
                <Input readOnly value={result.email} className="bg-muted/30 pr-10 font-mono text-sm" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
                  onClick={() => copyToClipboard(result.email, "Email")}
                >
                  <Copy className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
                </Button>
              </div>
            </div>

            {result.password && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Temporary Password
                </Label>
                <div className="relative">
                  <Input
                    readOnly
                    type={isVisible ? "text" : "password"}
                    value={result.password}
                    className="bg-muted/30 pr-20 font-mono text-sm"
                  />
                  <div className="absolute top-0 right-0 flex h-full items-center pr-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      onClick={() => setIsVisible(!isVisible)}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      onClick={() => copyToClipboard(result.password!, "Password")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button className="mt-2 w-full" onClick={() => handleOpenChange(false)}>
              I've saved the credentials
            </Button>
          </div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
