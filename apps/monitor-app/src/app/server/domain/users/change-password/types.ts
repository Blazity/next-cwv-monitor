import { validatePasswordStrength } from "@/lib/utils";
import { type as arkType } from "arktype";

const Password = arkType("string > 0").configure({
  expected: () => "not empty",
  actual: () => "",
});

const baseSchema = {
  currentPassword: Password,
  newPassword: Password,
  confirmPassword: Password,
};

const StrongPassword = Password.narrow((val, ctx) => {
  const strength = validatePasswordStrength(val);
  if (!strength.valid) {
    ctx.error({
      code: "predicate",
      message: strength.message,
    });
    return false;
  }
  return true;
});

export const changePasswordSchema = arkType(baseSchema).narrow((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) {
    ctx.error({
      path: ["confirmPassword"],
      message: "Passwords must match",
    });
    return false;
  }
  return true;
});

export const serverChangePasswordSchema = arkType({
  ...baseSchema,
  newPassword: StrongPassword,
});

export type ChangePasswordData = typeof changePasswordSchema.infer;
