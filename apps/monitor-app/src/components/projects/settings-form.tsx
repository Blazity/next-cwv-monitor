'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { deleteProjectAction } from '@/actions/project/delete-project';
import { updateProjectNameAction } from '@/actions/project/update-project';
import { resetProjectDataAction } from '@/actions/project/reset-project-action';
import { ProjectWithViews } from '@/app/server/lib/clickhouse/schema';
import { cn } from '@/lib/utils';
import { AlterProjectInput } from '@/app/server/domain/projects/create/schema';
import { useForm } from 'react-hook-form';

type ProjectSettingsValues = Omit<AlterProjectInput, 'slug'>;

const handleCopy = async (text: string, setter: (v: boolean) => void) => {
  await navigator.clipboard.writeText(text);
  setter(true);
  toast.success('Copied to clipboard');
  setTimeout(() => setter(false), 2000);
};

type SettingsFormProps = {
  project: ProjectWithViews;
};

export default function SettingsForm({ project }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSDK, setCopiedSDK] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty }
  } = useForm<ProjectSettingsValues>({
    defaultValues: {
      name: project.name
    }
  });

  const onSubmit = (data: ProjectSettingsValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('slug', project.slug || '');

      const result = await updateProjectNameAction(project.id, formData);

      if (result.errors) {
        setError('name', { type: 'server', message: result.errors.name.join(', ') });
        toast.error(result.message || 'Validation failed');
      } else if (result.success) {
        toast.success('Project updated successfully');
      }
    });
  };

  const handleResetConfirm = () => {
    startTransition(async () => {
      const res = await resetProjectDataAction(project.id);
      if (res.success) {
        toast.success('Project data has been cleared');
      } else {
        toast.error('Failed to reset data');
      }
    });
  };
  const sdkCode = `  
'use client';

import { CWVMonitor } from 'cwv-monitor-sdk/app-router';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CWVMonitor projectId="${project.id}" endpoint="https://your-monitor.example">
      {children}
    </CWVMonitor>
  );
}
  `;

  return (
    <main>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-9 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-semibold">Project Settings</h1>
            <p className="text-muted-foreground text-sm">{project.name}</p>
          </div>
        </div>

        <Card className="py-6">
          <CardHeader className="px-6">
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Basic information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div className="text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>{project.slug || 'No domain'}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{project.trackedViews.toLocaleString() || 0} tracked views</span>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    {...register('name', { required: 'Name is required' })}
                    className={cn(
                      'bg-background dark:bg-input/30',
                      errors.name && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  <Button type="submit" disabled={isPending || !isDirty}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
                {errors.name && <p className="text-destructive text-xs font-medium">{errors.name.message}</p>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="py-6">
          <CardHeader className="px-6">
            <CardTitle>Project ID</CardTitle>
            <CardDescription>Use this ID to integrate the CWV Monitor SDK into your application</CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <div className="flex items-center gap-2">
              <code className="bg-muted text-foreground flex-1 rounded-md px-3 py-2 font-mono text-sm">
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

        <Card className="py-6">
          <CardHeader className="px-6">
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
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5">npm install cwv-monitor-sdk</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 py-6">
          <CardHeader className="px-6">
            <div className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Danger Zone</CardTitle>
            </div>
            <CardDescription>Irreversible actions that affect your project data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6">
            <div className="bg-card flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-medium">Reset all data</p>
                <p className="text-muted-foreground text-sm">Delete all metrics and start fresh.</p>
              </div>
              <DangerAction
                title="Reset project data?"
                description="This will permanently delete all collected Core Web Vitals data for this project. This action cannot be undone."
                confirmText={project.name}
                buttonLabel="Reset"
                icon={RefreshCw}
                variant="outline"
                isPending={isPending}
                onConfirm={handleResetConfirm}
              />
            </div>

            <div className="bg-card flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-medium">Delete project</p>
                <p className="text-muted-foreground text-sm">Permanently delete this project and all its data.</p>
              </div>
              <DangerAction
                title="Delete project?"
                description={`This will permanently delete the project "${project.name}" and all associated data. This action cannot be undone.`}
                confirmText={project.name}
                buttonLabel="Delete"
                icon={Trash2}
                isPending={isPending}
                onConfirm={() => startTransition(() => deleteProjectAction(project.id))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const handlePrevent = (e: React.SyntheticEvent) => {
  e.preventDefault();
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

export function DangerAction({
  title,
  description,
  confirmText,
  buttonLabel,
  icon: Icon,
  onConfirm,
  isPending,
  variant = 'destructive'
}: DangerActionProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCountdown(10);
      setConfirmInput('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const isTimerRunning = countdown > 0;
  const isInputMatch = confirmInput === confirmText;

  let dynamicLabel;
  if (isTimerRunning) {
    dynamicLabel = `Wait ${countdown}s...`;
  } else if (isInputMatch) {
    dynamicLabel = `Confirm ${buttonLabel}`;
  } else {
    dynamicLabel = `Type "${confirmText}" to confirm`;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          className={cn(
            'gap-2',
            variant === 'outline' && 'text-destructive border-destructive/50 hover:bg-destructive/10'
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className={cn('transition-transform')}>
        <AlertDialogHeader>
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p>{description}</p>
            <div className="select-none">
              <p className="text-foreground text-sm leading-none font-medium select-none">
                Type
                <code className="px-2 font-mono font-black">{confirmText}</code>
                to confirm
              </p>
            </div>
          </AlertDialogDescription>

          <Input
            className="font-mono transition-all"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            onPaste={handlePrevent}
            onDrop={handlePrevent}
            onContextMenu={handlePrevent}
            autoComplete="off"
            placeholder={`Type: ${confirmText}`}
          />
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={() => setConfirmInput('')}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isTimerRunning || !isInputMatch || isPending}
            className={'min-w-[200px]'}
            onClick={() => {
              onConfirm();
              setIsOpen(false);
            }}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dynamicLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
