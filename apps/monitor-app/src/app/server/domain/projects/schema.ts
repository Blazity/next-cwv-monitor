import { createConfig } from "@/app/server/lib/arktype-utils";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { normalizeHostname } from "@/lib/utils";
import { type as arkType, scope } from "arktype";

const projectLabels: Record<string, string> = {
  name: "Project name",
  slug: "Project domain",
  projectId: "Project ID",
};

const corsScope = scope({
  // Matches localhost or standard domain names (no protocol, no path). Supports subdomains and TLDs (2+ chars)
  Hostname: /^(localhost|([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})$/i,

  // Matches CORS wildcards (e.g., *.domain.com)
  WildcardHostname: /^(\*\.)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,

  root: "Hostname | WildcardHostname | string.ip",
});

const corsModule = corsScope.export();

const projectConfig = createConfig(projectLabels);

export const nameSchema = arkType("string > 0").configure({
  ...projectConfig,
  expected: () => "not be empty",
});

export const slugSchema = arkType("string>0").pipe(normalizeHostname).to(corsModule.root).configure({
  ...projectConfig,
  expected: () => "a valid hostname, wildcard (e.g., *.domain.com), or IP address",
});

export const projectIdSchema = arkType("string.uuid").configure(projectConfig);

export const projectBase = arkType({
  projectId: projectIdSchema,
  name: nameSchema,
  slug: slugSchema,
  eventSettings: eventDisplaySettingsSchema.out,
});
