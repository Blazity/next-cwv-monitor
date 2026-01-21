import { EventsCardsSkeleton, EventsTabsSkeleton } from "@/components/events/events-skeleton";
import { PageHeaderSkeleton } from "@/components/dashboard/page-header-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton title="Events" description="Track conversions and manage custom events" />
      <EventsCardsSkeleton />
      <EventsTabsSkeleton />
    </div>
  );
}
