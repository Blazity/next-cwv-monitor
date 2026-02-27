export type NotificationAction = {
  type: 'button';
  text: string;
  url: string;
  kind?: 'investigate' | 'chat' | 'acknowledge';
};

export type NotificationPayload = {
  title: string;
  text: string;
  fields?: Array<{ title: string; value: string; short: boolean }>;
  actions?: NotificationAction[];
  metadata?: {
    anomalyId?: string;
    projectId?: string;
    metricName?: string;
    [key: string]: unknown;
  };
};

export type NotificationConfig = {
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
};
