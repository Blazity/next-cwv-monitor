'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { toast } from 'sonner';
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
  LucideIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import { updateProjectNameAction } from '@/app/server/actions/project/update-project';
import { deleteProjectAction } from '@/app/server/actions/project/delete-project';
import { resetProjectDataAction } from '@/app/server/actions/project/reset-project';
import { UpdateProjectNameInput, updateProjectNameSchema } from '@/app/server/domain/projects/schema';
import { ProjectWithViews } from '@/app/server/lib/clickhouse/schema';
import { capitalizeFirstLetter, cn, formatDate } from '@/lib/utils';

const getSdkCode = (id: string) => `'use client';

import { CWVMonitor } from 'cwv-monitor-sdk/app-router';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CWVMonitor projectId="${id}" endpoint="https://your-monitor.example">
      {children}
    </CWVMonitor>
  );
}
`;

const handleCopy = async (text: string, setter: (v: boolean) => void) => {
  await navigator.clipboard.writeText(text);
  setter(true);
  toast.success('Copied to clipboard');
  setTimeout(() => setter(false), 2000);
};

const handlePreventPaste = (e: React.ClipboardEvent) => {
  e.preventDefault();
};

export default function SettingsForm({ project }: { project: ProjectWithViews }) {
  const router = useRouter();
  const sdkCode = getSdkCode(project.id);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSDK, setCopiedSDK] = useState(false);

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
              <Globe className="size-4" /> {project.slug || 'No domain'}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4" /> Created {formatDate(project.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <Eye className="size-4" /> {project.trackedViews.toLocaleString()} tracked views
            </div>
          </div>
          <UpdateNameForm project={project} />
        </CardContent>
      </Card>

      <Card className="py-6">
        <CardHeader className="px-6">
          <CardTitle>Project ID</CardTitle>
          <CardDescription>Use this ID to integrate the CWV Monitor SDK into your application</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex items-center gap-2">
            <code className="bg-muted text-foreground flex-1 rounded-md px-3 py-2 font-mono text-sm">{project.id}</code>
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

      <Card>
        <CardHeader>
          <CardTitle>SDK Integration</CardTitle>
          <CardDescription>
            Add the following code to your application to start collecting Core Web Vitals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="relative">
            <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-4 font-mono text-sm">{sdkCode}</pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(sdkCode, setCopiedSDK)}
              className="absolute top-2 right-2 h-8 gap-1.5 bg-transparent"
            >
              {copiedSDK ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedSDK ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Install the SDK with{' '}
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5">npm install cwv-monitor-sdk</code> and add
            this to your app's entry point
          </p>
        </CardContent>
      </Card>

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
            onConfirm={async () => {
              const res = await resetProjectDataAction(project.id);
              if (res.success) toast.success('Project data has been cleared');
              else toast.error('Failed to reset data');
            }}
          />
          <DangerRow
            title="Delete project"
            desc={`Permanently delete the "${project.name}" project and all its data. This action cannot be undone.`}
            label="Delete"
            icon={Trash2}
            confirmText={project.name}
            onConfirm={async () => {
              const res = await deleteProjectAction(project.id);
              if (res.success) router.push('/projects');
              else toast.error(res.message);
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function UpdateNameForm({ project }: { project: ProjectWithViews }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateProjectNameInput>({
    resolver: arktypeResolver(updateProjectNameSchema),
    defaultValues: { name: project.name }
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty }
  } = form;

  useEffect(() => reset({ name: project.name }), [project.name, reset]);

  const applyServerErrors = (serverErrors: Record<string, string | string[]>) => {
    for (const [key, value] of Object.entries(serverErrors)) {
      setError(key as keyof UpdateProjectNameInput, {
        type: 'server',
        message: Array.isArray(value) ? value[0] : value
      });
    }
  };

  const onSubmit = (data: UpdateProjectNameInput) => {
    startTransition(async () => {
      const result = await updateProjectNameAction(project.id, project.slug, data.name);

      if (result.success) {
        toast.success('Project name has been updated');
        reset(data);
      } else {
        if (result.errors) {
          applyServerErrors(result.errors);
        }
        toast.error(result.message || 'Failed to update project name');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <Label htmlFor="name">Project Name</Label>
      <div className="flex gap-2">
        <Input {...register('name')} id="name" className="bg-background w-full" data-1p-ignore autoComplete="off" />
        <Button type="submit" disabled={!isDirty || isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save
        </Button>
      </div>
      {errors.name?.message && <p className="text-destructive text-xs">{capitalizeFirstLetter(errors.name.message)}</p>}
    </form>
  );
}

type DangerRowProps = {
  title: string;
  desc: string;
  onConfirm: () => void | Promise<void>;
  confirmText: string;
  label: string;
  icon: LucideIcon;
};

type DangerActionProps = {
  title: string;
  description: string;
  confirmText: string;
  buttonLabel: string;
  icon: LucideIcon;
  onConfirm: () => void;
  isPending: boolean;
  variant?: 'destructive' | 'outline';
};

function DangerRow({ title, desc, onConfirm, confirmText, label, icon: Icon }: DangerRowProps) {
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
        icon={Icon}
        isPending={isPending}
        onConfirm={() => startTransition(onConfirm)}
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
  variant = 'outline'
}: DangerActionProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCountdown(10);
      setConfirmInput('');
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
          disabled={isPending}
          className={cn(
            'gap-2',
            variant === 'outline' &&
              'text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive'
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
              disabled={isTimerRunning || !isInputMatch || isPending}
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
