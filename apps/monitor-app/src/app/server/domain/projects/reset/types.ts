import { projectBase } from "@/app/server/domain/projects/schema";

export const resetProjectSchema = projectBase.pick("projectId");

export type ResetProjectInput = typeof resetProjectSchema.infer;
export type ResetProjectResult = { kind: "ok" } | { kind: "error"; message: string };
