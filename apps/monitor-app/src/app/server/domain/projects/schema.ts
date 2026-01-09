import { createConfig } from "@/app/server/lib/arktype-utils";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { type as arkType } from "arktype";

const projectLabels: Record<string, string> = {
  name: "Project name",
  slug: "Project slug",
  projectId: "Project ID",
};

const projectConfig = createConfig(projectLabels);

export const nameSchema = arkType("string > 0").configure({
  ...projectConfig,
  expected: () => "not be empty",
});

export const slugSchema = arkType("string > 0")
  .configure({
    ...projectConfig,
    expected: () => "not be empty",
  })
  .narrow((s, ctx) => {
    if (!/^[a-z0-9-]+$/.test(s)) {
      ctx.error({
        code: "predicate",
        message: "Project slug must contain only lowercase letters, numbers, and hyphens",
      });
      return false;
    }
    return true;
  });

export const projectIdSchema = arkType("string.uuid").configure(projectConfig);

export const projectBase = arkType({
  projectId: projectIdSchema,
  name: nameSchema,
  slug: slugSchema,
  eventSettings: eventDisplaySettingsSchema.out,
});
