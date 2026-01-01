import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, userAc, defaultStatements } from "better-auth/plugins/admin/access";

export const AUTH_ROLES_MAP = {
  admin: "admin",
  member: "member",
} as const;

export type AuthRole = keyof typeof AUTH_ROLES_MAP;
export const AUTH_ROLES = Object.values(AUTH_ROLES_MAP) as AuthRole[];
export const ADMIN_ROLES: AuthRole[] = [AUTH_ROLES_MAP.admin];

export const statement = {
  ...defaultStatements,
  project: ["create", "get", "update", "delete", "reset"],
} as const;

export const ac = createAccessControl(statement);

type AccessControlObject = ReturnType<typeof ac.newRole>;

export const roleAccessControl = {
  [AUTH_ROLES_MAP.admin]: ac.newRole({
    ...adminAc.statements,
    project: ["create", "get", "update", "delete", "reset"],
  }),
  [AUTH_ROLES_MAP.member]: ac.newRole({
    ...userAc.statements,
    project: ["get"],
  }),
} satisfies Record<AuthRole, AccessControlObject>;
