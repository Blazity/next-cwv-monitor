import { type } from 'arktype';

export const nameSchema = type('string > 0');
export const slugSchema = type('string > 0').narrow((s: string, ctx) =>
  /^[a-z0-9-]+$/.test(s) ? true : ctx.mustBe('only lowercase letters, numbers, and hyphens')
);

export const projectIdSchema = type('string.uuid');

export const createProjectSchema = type({
  name: nameSchema,
  slug: slugSchema,
});

export const updateProjectNameSchema = type({
  name: nameSchema,
});

export type CreateProjectInput = typeof createProjectSchema.infer;
export type UpdateProjectNameInput = typeof updateProjectNameSchema.infer;
