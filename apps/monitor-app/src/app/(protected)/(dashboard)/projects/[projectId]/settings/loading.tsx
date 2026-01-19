import {
  SettingsDangerZoneSkeleton,
  SettingsProjectIDSkeleton,
  SettingsProjectInfoSkeleton,
  SettingsSDKIntegrationSkeleton,
} from "@/components/projects/settings/settings-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="border-input bg-background flex h-9 w-9 items-center justify-center rounded-md border opacity-50">
          <ArrowLeft className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <SettingsProjectInfoSkeleton />
      <SettingsProjectIDSkeleton />
      <SettingsSDKIntegrationSkeleton />
      <SettingsDangerZoneSkeleton />
    </main>
  );
}
