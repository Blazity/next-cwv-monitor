import { type as arkType } from "arktype";
import { projectIdSchema } from "@/app/server/domain/projects/schema";

export const deleteProjectSchema = arkType({
  projectId: projectIdSchema,
});

export type DeleteProjectInput = typeof deleteProjectSchema.infer;
export type DeleteProjectResult = { kind: "ok" } | { kind: "error"; message: string };