'use client';

import { AnalyticsTab } from '@/components/events/analytics-tab';
import { ManageTab } from '@/components/events/manage-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QUERY_STATE_OPTIONS } from '@/lib/search-params';
import { BarChart3, Settings2 } from 'lucide-react';
import { parseAsStringEnum, useQueryState } from 'nuqs';

type Props = React.ComponentProps<typeof AnalyticsTab> & Pick<React.ComponentProps<typeof ManageTab>, 'projectId'>;

const tabs = ['analytics', 'manage'] as const;

function isTab(value: string): value is (typeof tabs)[number] {
  return tabs.includes(value as (typeof tabs)[number]);
}

export function EventsTabs({ chartData, eventDisplaySettings, eventStats, events, projectId, selectedEvent }: Props) {
  const [selectedTab, setSelectedTab] = useQueryState(
    'tab',
    parseAsStringEnum([...tabs])
      .withDefault('analytics')
      .withOptions({ ...QUERY_STATE_OPTIONS, shallow: true })
  );

  return (
    <Tabs
      defaultValue={selectedTab}
      onValueChange={(e) => {
        if (!isTab(e)) return;
        setSelectedTab(e);
      }}
      className="space-y-6"
    >
      <TabsList className="bg-muted">
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="manage" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Manage Events
        </TabsTrigger>
      </TabsList>
      <TabsContent value="analytics" className="space-y-6">
        <AnalyticsTab
          eventDisplaySettings={eventDisplaySettings}
          selectedEvent={selectedEvent}
          chartData={chartData}
          eventStats={eventStats}
          events={events}
        />
      </TabsContent>
      <TabsContent value="manage" className="space-y-6">
        <ManageTab eventNames={events} eventsDisplaySettings={eventDisplaySettings} projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
