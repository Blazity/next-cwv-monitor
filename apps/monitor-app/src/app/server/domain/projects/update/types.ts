import { type as arkType } from "arktype";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { nameSchema, projectIdSchema, slugSchema } from "@/app/server/domain/projects/schema";

export const updateProjectNameSchema = arkType({
  name: nameSchema,
});

export const updateProjectSchema = arkType({
  projectId: projectIdSchema,
  "slug?": slugSchema,
  "name?": nameSchema,
  "eventSettings?": eventDisplaySettingsSchema.out,
});

export type UpdateProjectInput = typeof updateProjectSchema.infer;
export type UpdateProjectNameInput = typeof updateProjectNameSchema.infer;
export type UpdateProjectResult = { kind: "ok" } | { kind: "error"; message: string };
