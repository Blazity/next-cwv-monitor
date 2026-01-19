import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsProjectInfoSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-52" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsProjectIDSkeleton() {
  return (
    <Card className="py-6">
      <CardHeader className="px-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-9 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsSDKIntegrationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-full max-w-[400px]" />
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <div className="flex items-center justify-between">
          <div className="bg-muted/50 flex h-9 w-[180px] items-center gap-1 rounded-lg px-1">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>

        <Skeleton className="h-92 w-full rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsDangerZoneSkeleton() {
  return (
    <Card className="border-destructive/20">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-3/4 max-w-[400px]" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-112" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>{" "}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-140" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
