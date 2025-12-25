import { type as arkType } from 'arktype';

export const createUserSchema = arkType({
  name: arkType('string >= 1')
    .describe('not empty')
    .configure({ actual: () => '' }),
  email: arkType('string.email & string >= 1')
    .describe('a valid email address')
    .configure({ actual: () => '' }),
  role: arkType("'admin' | 'user'")
    .describe("user's role")
    .configure({ actual: () => 'user' })
});
