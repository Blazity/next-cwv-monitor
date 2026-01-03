import { type as arkType } from "arktype";

export const changePasswordSchema = arkType({
  currentPassword: "string > 0",
  newPassword: "string > 0",
  confirmPassword: "string",
}).narrow((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) {
    return ctx.mustBe("match the new password");
  }
  return true;
});

export type ChangePasswordData = typeof changePasswordSchema.infer;

export const serverChangePasswordSchema = changePasswordSchema.narrow((data, ctx) => {
  const { validatePasswordStrength } = require("@/lib/utils");
  const strength = validatePasswordStrength(data.newPassword);

  if (!strength.valid) {
    return ctx.mustBe(strength.message);
  }
  return true;
});
