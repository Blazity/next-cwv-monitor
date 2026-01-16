import { EventsCardsSkeleton, EventsTabsSkeleton } from "@/components/events/events-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Track conversions and manage custom events" />
      <EventsCardsSkeleton />
      <EventsTabsSkeleton />
    </div>
  );
}
