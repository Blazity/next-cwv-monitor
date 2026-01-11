import { projectBase } from "@/app/server/domain/projects/schema";

export const updateProjectNameSchema = projectBase.pick("name");

export const updateProjectSchema = projectBase
  .pick("projectId")
  .and(projectBase.pick("name", "slug", "eventSettings").partial());

export type UpdateProjectInput = typeof updateProjectSchema.infer;
export type UpdateProjectNameInput = typeof updateProjectNameSchema.infer;
export type UpdateProjectResult = { kind: "ok" } | { kind: "error"; message: string };
