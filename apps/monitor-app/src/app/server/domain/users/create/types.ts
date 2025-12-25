import { type as arkType } from 'arktype';

export const createUserSchema = arkType({
  username: arkType('string >= 1')
    .describe('not empty')
    .configure({ actual: () => '' }),
  email: arkType('string.email & string >= 1')
    .describe('a valid email address')
    .configure({ actual: () => '' }),
  role: arkType("'admin' | 'user'")
    .describe("user's role")
    .configure({ actual: () => 'user' })
});

export type CreateUserCommand = {
  username: string;
  email: string;
  role: 'admin' | 'user';
};
