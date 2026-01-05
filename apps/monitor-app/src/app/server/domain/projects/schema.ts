import { type } from "arktype";

export const nameSchema = type("string > 0");
export const slugSchema = type("string > 0").narrow((s: string, ctx) =>
  /^[a-z0-9-]+$/.test(s) ? true : ctx.mustBe("lowercase letters, numbers, and hyphens")
);
export const projectIdSchema = type("string.uuid");