"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Globe,
  Calendar,
  Eye,
  Trash2,
  RefreshCw,
  LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { deleteProjectAction } from "@/app/server/actions/project/delete-project";
import { resetProjectDataAction } from "@/app/server/actions/project/reset-project";
import { UpdateProjectNameInput, updateProjectNameSchema } from "@/app/server/domain/projects/update/types";
import { ProjectWithViews } from "@/app/server/lib/clickhouse/schema";
import { cn, formatDate } from "@/lib/utils";
import { updateProjectAction } from "@/app/server/actions/project/update-project";
import { useAction } from "next-safe-action/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SettingsFormProps = {
  project: ProjectWithViews;
  permissions: {
    canUpdate: boolean;
    canReset: boolean;
    canDelete: boolean;
  };
};

const getSdkCodes = (id: string) => ({
  app: `import { CWVMonitor } from 'next-cwv-monitor/app-router';

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CWVMonitor 
          projectId="${id}" 
          endpoint="https://your-monitor-api.com"
          sampleRate={0.5} // Optional: track 50% of page views
        >
          {children}
        </CWVMonitor>
      </body>
    </html>
  );
}`,
  pages: `import type { AppProps } from 'next/app';
import { CWVMonitor } from 'next-cwv-monitor/pages-router';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CWVMonitor projectId="${id}" endpoint="https://your-monitor-api.com">
      <Component {...pageProps} />
    </CWVMonitor>
  );
}`,
});

const handleCopy = async (text: string, setter: (v: boolean) => void) => {
  await navigator.clipboard.writeText(text);
  setter(true);
  toast.success("Copied to clipboard");
  setTimeout(() => setter(false), 2000);
};

const handlePreventPaste = (e: React.ClipboardEvent) => {
  e.preventDefault();
};

export default function SettingsForm({ project, permissions }: SettingsFormProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(false);

  const { execute: executeReset } = useAction(resetProjectDataAction, {
    onSuccess: ({ data }) => {
      if (data.success) toast.success(data.message);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to reset project data");
    },
  });

  const { execute: executeDelete } = useAction(deleteProjectAction, {
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to delete project");
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-muted-foreground text-sm">{project.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic information about your project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Globe className="size-4" /> {project.domain || "No domain"}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4" /> Created {formatDate(project.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <Eye className="size-4" /> {project.trackedViews.toLocaleString()} tracked views
            </div>
          </div>
          <UpdateNameForm project={project} isEnabled={permissions.canUpdate} />
        </CardContent>
      </Card>

      <Card className="py-6">
        <CardHeader className="px-6">
          <CardTitle>Project ID</CardTitle>
          <CardDescription>Use this ID to integrate the CWV Monitor SDK into your application</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex items-center gap-2">
            <code className="bg-muted text-foreground flex-1 rounded-md px-3 py-2 font-mono text-sm break-all">
              {project.id}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(project.id, setCopiedId)}
              className="dark:bg-input/30 size-9"
            >
              {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SDKIntegrationCard projectId={project.id} />

      <Card className="border-destructive/20">
        <CardHeader>
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions that affect your project data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DangerRow
            title="Reset project data"
            desc="Delete all collected metrics and start fresh. This cannot be undone."
            label="Reset"
            icon={RefreshCw}
            confirmText={project.name}
            onConfirm={() => executeReset({ projectId: project.id })}
            isEnabled={permissions.canReset}
          />
          <DangerRow
            title="Delete project"
            desc={`Permanently delete the "${project.name}" project and all its data. This action cannot be undone.`}
            label="Delete"
            icon={Trash2}
            confirmText={project.name}
            onConfirm={() => executeDelete({ projectId: project.id })}
            isEnabled={permissions.canDelete}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function UpdateNameForm({ project, isEnabled }: { project: ProjectWithViews; isEnabled: boolean }) {
  const form = useForm<UpdateProjectNameInput>({
    resolver: arktypeResolver(updateProjectNameSchema),
    defaultValues: { name: project.name },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => reset({ name: project.name }), [project.name, reset]);

  const { execute, isPending } = useAction(updateProjectAction, {
    onSuccess: ({ data }) => {
      if (data.success) {
        toast.success("Project name has been updated");
        reset({ name: form.getValues().name });
      }
    },
    onError: ({ error }) => {
      if (error.validationErrors) {
        for (const [key, value] of Object.entries(error.validationErrors)) {
          setError(key as keyof UpdateProjectNameInput, {
            type: "server",
            message: Array.isArray(value) ? value[0] : (value as string),
          });
        }
      }
      toast.error(error.serverError || "Failed to update project name");
    },
  });

  const onSubmit = (values: UpdateProjectNameInput) => {
    execute({
      projectId: project.id,
      name: values.name,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <Label htmlFor="name">Project Name</Label>
      <div className="flex gap-2">
        <Input
          {...register("name")}
          id="name"
          className="bg-background w-full"
          data-1p-ignore
          autoComplete="off"
          disabled={!isEnabled}
        />
        <Button type="submit" disabled={!isDirty || isPending || !isEnabled}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save
        </Button>
      </div>
      {errors.name?.message && <p className="text-destructive text-xs">{errors.name.message}</p>}
    </form>
  );
}

function SDKIntegrationCard({ projectId }: { projectId: string }) {
  const codes = getSdkCodes(projectId);
  const [activeTab, setActiveTab] = useState<"app" | "pages">("app");
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    const textToCopy = codes[activeTab];
    void handleCopy(textToCopy, setCopied);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDK Integration</CardTitle>
        <CardDescription>
          Add the following code to your application to start collecting Core Web Vitals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <Tabs className="w-full" value={activeTab} onValueChange={(v) => setActiveTab(v as "app" | "pages")}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="app">App Router</TabsTrigger>
              <TabsTrigger value="pages">Pages Router</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="sm" onClick={onCopy} className="h-8 gap-1.5">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <TabsContent value="app" className="relative">
            <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-4 font-mono text-sm">{codes.app}</pre>
          </TabsContent>
          <TabsContent value="pages" className="relative">
            <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-4 font-mono text-sm">
              {codes.pages}
            </pre>
          </TabsContent>
        </Tabs>
        <p className="text-muted-foreground text-sm">
          Install the SDK with{" "}
          <code className="bg-muted text-foreground rounded px-1.5 py-0.5">npm install next-cwv-monitor</code> and add
          this to your app's entry point
        </p>
      </CardContent>
    </Card>
  );
}

type DangerRowProps = {
  title: string;
  desc: string;
  onConfirm: () => void | Promise<void>;
  confirmText: string;
  label: string;
  icon: LucideIcon;
  isEnabled: boolean;
};

type DangerActionProps = {
  title: string;
  description: string;
  confirmText: string;
  buttonLabel: string;
  icon: LucideIcon;
  onConfirm: () => void;
  isPending: boolean;
  variant?: "destructive" | "outline";
  isEnabled: boolean;
};

function DangerRow({ title, desc, onConfirm, confirmText, label, icon, isEnabled }: DangerRowProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{desc}</p>
      </div>
      <DangerAction
        title={title}
        description={desc}
        confirmText={confirmText}
        buttonLabel={label}
        icon={icon}
        isPending={isPending}
        onConfirm={() => startTransition(onConfirm)}
        isEnabled={isEnabled}
      />
    </div>
  );
}

function DangerAction({
  title,
  description,
  confirmText,
  buttonLabel,
  icon: Icon,
  onConfirm,
  isPending,
  variant = "outline",
  isEnabled,
}: DangerActionProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCountdown(10);
      setConfirmInput("");
    }
  };

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const isTimerRunning = countdown > 0;
  const isInputMatch = confirmInput.toLowerCase() === confirmText.toLowerCase();

  const handleAction = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isTimerRunning && isInputMatch) {
      onConfirm();
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          disabled={isPending || !isEnabled}
          className={cn(
            "gap-2",
            variant === "outline" &&
              "text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        <form onSubmit={handleAction}>
          <AlertDialogHeader>
            <div className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed">{description}</p>
                <div className="">
                  <p className="text-foreground font-medium">
                    To confirm, type <span className="font-mono font-black">{confirmText}</span> below
                  </p>
                </div>
              </div>
            </AlertDialogDescription>

            <Input
              className="focus-visible:ring-destructive font-mono"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onPaste={handlePreventPaste}
              data-1p-ignore
              autoComplete="off"
              spellCheck="false"
              placeholder={confirmText}
            />
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={isTimerRunning || !isInputMatch || isPending || !isEnabled}
              className="min-w-[140px]"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : isTimerRunning ? (
                `Wait ${countdown}s`
              ) : (
                `Confirm ${buttonLabel}`
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
