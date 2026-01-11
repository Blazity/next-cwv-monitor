import { type as arkType } from "arktype";
import { createConfig } from "@/app/server/lib/arktype-utils";

const authLabels = {
  name: "Name",
  email: "Email address",
  password: "Password",
  role: "User role",
};

export const authConfig = createConfig(authLabels);

export const emailSchema = arkType("string.email").configure({
  ...authConfig,
  expected: () => "be a valid email address",
});

export const passwordSchema = arkType("string > 0").configure({
  ...authConfig,
  expected: () => "not be empty",
});

export const nameSchema = arkType("string > 0").configure({
  ...authConfig,
  expected: () => "not be empty",
});
