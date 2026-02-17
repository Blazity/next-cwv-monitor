import { buildEventsDashboardQuery } from "@/app/server/domain/dashboard/events/mappers";
import { EventsDashboardService } from "@/app/server/domain/dashboard/events/service";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventsCards } from "@/components/events/events-cards";
import { EventsTabs } from "@/components/events/events-tabs";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { eventsSearchParamsCache } from "@/lib/search-params";
import { notFound } from "next/navigation";

const eventsService = new EventsDashboardService();

async function EventsPage({ params, searchParams }: PageProps<"/projects/[projectId]/events">) {
  await getAuthorizedSession();
  const { projectId } = await params;
  const parsedParams = eventsSearchParamsCache.parse(await searchParams);

  const query = buildEventsDashboardQuery({
    projectId,
    ...parsedParams,
  });

  const result = await eventsService.getDashboardData(query);

  if (result.kind === "project-not-found") notFound();
  if (result.kind === "error") throw new Error(result.message);

  const { displaySettings, mostActiveEvent, totalStats, chartData, eventStats, eventNames, queriedEvents } =
    result.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Track conversions and manage custom events" />

      <EventsCards
        eventDisplaySettings={displaySettings}
        mostActiveEvent={mostActiveEvent}
        totalEventData={totalStats}
      />
      <EventsTabs
        chartData={chartData}
        eventDisplaySettings={displaySettings}
        eventStats={eventStats}
        events={eventNames}
        projectId={projectId}
        selectedEvents={queriedEvents}
      />
    </div>
  );
}

export default EventsPage;
