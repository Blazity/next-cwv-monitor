import { NotificationConfig, NotificationPayload } from "@/app/server/domain/notifications/types";
import { logger } from "@/app/server/lib/logger";
import { env } from "@/env";

export class NotificationDispatcher {
  constructor(private config: NotificationConfig) {}

  async send(notification: NotificationPayload): Promise<void> {
    const { slackWebhookUrl, teamsWebhookUrl } = this.config;

    if (!slackWebhookUrl && !teamsWebhookUrl) {
      logger.warn("No notification webhooks configured. Skipping.");
      return;
    }

    const promises: Promise<void>[] = [];

    if (slackWebhookUrl) {
      promises.push(this.sendToSlack(slackWebhookUrl, notification));
    }

    if (teamsWebhookUrl) {
      promises.push(this.sendToTeams(teamsWebhookUrl, notification));
    }

    await Promise.allSettled(promises);
  }
  private async sendToSlack(url: string, payload: NotificationPayload): Promise<void> {
    try {
      // Modern Slack "Block Kit" format
      const blocks = [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${payload.title}*\n${payload.text}` }
        }
      ];

      if (payload.fields && payload.fields.length > 0) {
        blocks.push({
          type: "section",
          fields: payload.fields.slice(0, 10).map(f => ({
            type: "mrkdwn",
            text: `*${f.title}*\n${f.value}`
          }))
        });
      }

      if (payload.actions && payload.actions.length > 0) {
        blocks.push({
          type: "actions",
          elements: payload.actions.map(action => ({
            type: "button",
            text: { type: "plain_text", text: action.text },
            url: action.url,
            style: "primary"
          }))
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      logger.info("Sent Slack notification");
    } catch (error) {
      logger.error({ err: error }, "Failed to send Slack notification");
    }
  }

  private async sendToTeams(url: string, payload: NotificationPayload): Promise<void> {
    try {
      const adaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          { type: "textBlock", text: payload.title, weight: "bolder", size: "medium" },
          { type: "textBlock", text: payload.text, wrap: true },
          {
            type: "factSet",
            facts: payload.fields?.map(f => ({ title: f.title, value: f.value })) || []
          }
        ],
        actions: payload.actions?.map(action => ({
          type: "Action.OpenUrl",
          title: action.text,
          url: action.url
        })) || []
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: "message",
          attachments: [{
            contentType: "application/vnd.microsoft.card.adaptive",
            content: adaptiveCard
          }]
        }),
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      logger.info("Sent Teams notification");
    } catch (error) {
      logger.error({ err: error }, "Failed to send Teams notification");
    }
  }
}

export const createNotificationDispatcher = (config: NotificationConfig) => new NotificationDispatcher(config);

export const dispatcher = new NotificationDispatcher({
  slackWebhookUrl: env.SLACK_WEBHOOK_URL,
  teamsWebhookUrl: env.TEAMS_WEBHOOK_URL,
});
