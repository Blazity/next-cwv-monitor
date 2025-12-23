import { type, Traversal } from 'arktype';

export const createProjectSchema = type({
  name: '3 <= string <= 50',
  slug: type('3 <= string <= 20').narrow((s: string, ctx: Traversal) =>
    /^[a-z0-9-]+$/.test(s) ? true : ctx.mustBe('only lowercase letters, numbers, and hyphens')
  )
});

export type CreateProjectInput = typeof createProjectSchema.infer;
