import { type as arkType } from "arktype";
import { nameSchema, slugSchema } from "@/app/server/domain/projects/schema";

export const createProjectSchema = arkType({
  name: nameSchema,
  slug: slugSchema,
});

export type CreateProjectInput = typeof createProjectSchema.infer;
export type CreateProjectResult =
  | { kind: "ok"; projectId: string }
  | { kind: "error"; message: string }
  | { kind: "already-exists"; slug: string };
