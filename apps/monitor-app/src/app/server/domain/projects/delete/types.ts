import { projectBase } from "@/app/server/domain/projects/schema";

export const deleteProjectSchema = projectBase.pick("projectId");

export type DeleteProjectInput = typeof deleteProjectSchema.infer;
export type DeleteProjectResult = { kind: "ok" } | { kind: "error"; message: string };
