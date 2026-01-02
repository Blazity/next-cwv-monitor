import { type as arkType } from "arktype";
import { projectIdSchema } from "@/app/server/domain/projects/schema";

export const resetProjectSchema = arkType({
  projectId: projectIdSchema,
});

export type ResetProjectInput = typeof resetProjectSchema.infer;
export type ResetProjectResult = { kind: "ok" } | { kind: "error"; message: string };