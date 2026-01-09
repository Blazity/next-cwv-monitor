import { validatePasswordStrength } from "@/lib/utils";
import { type as arkType } from "arktype";
import { createConfig } from "@/app/server/lib/arktype-utils";

const passwordLabels = {
  currentPassword: "Current password",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
};

export const passwordConfig = createConfig(passwordLabels);

const Password = arkType("string > 0").configure({
  ...passwordConfig,
  expected: () => "not be empty",
});

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

const baseFields = {
  currentPassword: Password,
  newPassword: Password,
  confirmPassword: Password,
};

export const changePasswordSchema = arkType(baseFields)
  .configure(passwordConfig)
  .narrow((data, ctx) => {
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
  ...baseFields,
  newPassword: StrongPassword,
}).configure(passwordConfig);

export type ChangePasswordData = typeof changePasswordSchema.infer;
