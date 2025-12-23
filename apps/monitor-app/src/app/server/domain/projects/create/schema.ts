import { type, Traversal } from 'arktype';

export const alterProjectSchema = type({
  name: 'string > 0',
  slug: type('string > 0').narrow((s: string, ctx: Traversal) =>
    /^[a-z0-9-]+$/.test(s) ? true : ctx.mustBe('only lowercase letters, numbers, and hyphens')
  )
});

export type AlterProjectInput = typeof alterProjectSchema.infer;
