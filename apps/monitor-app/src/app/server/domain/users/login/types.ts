import { emailSchema, passwordSchema } from "@/app/server/domain/users/types";
import { type as arkType } from "arktype";

export const loginSchema = arkType({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginData = typeof loginSchema.infer;