import { type as arkType } from "arktype";

export const loginSchema = arkType({
  email: arkType("string.email")
    .describe("a valid email address")
    .configure({ actual: () => "" }),
  password: arkType("string >= 1").configure({ actual: () => "" }),
});

export type LoginData = typeof loginSchema.infer;