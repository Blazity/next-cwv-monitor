export const AUTH_ROLES_MAP = {
  admin: "admin",
  member: "member",
} as const;

export type AuthRole = keyof typeof AUTH_ROLES_MAP;
export const AUTH_ROLES = Object.values(AUTH_ROLES_MAP) as AuthRole[];
export const ADMIN_ROLES: AuthRole[] = [AUTH_ROLES_MAP.admin];
