import { projectBase } from "@/app/server/domain/projects/schema";

export const createProjectSchema = projectBase.pick("name", "domain");

export type CreateProjectInput = typeof createProjectSchema.infer;
export type CreateProjectResult =
  | { kind: "ok"; projectId: string }
  | { kind: "error"; message: string }
  | { kind: "already-exists"; domain: string };
