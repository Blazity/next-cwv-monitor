import { sql } from '@/app/server/lib/clickhouse/client';
import { randomUUID } from 'node:crypto';

export type InsertUserRow = Pick<UserRow, 'name' | 'role' | 'email'>;
type InsertUsers = [InsertUserRow, ...InsertUserRow[]];

export async function insertUser(users: InsertUsers) {
  const rows = users.map((user) => [randomUUID(), user.name, user.email, UserRoleEnum[user.role]]);

  // TODO: verify uinque user, probabbly we will have to update db need to disscuss
  await sql`
    INSERT INTO user (
      id,
      name,
      email,
      role,
    )
    VALUES ${sql.values(rows, ['String', 'String', 'String', 'String'])}
  `.command();
}

type AvailableKeys = keyof UserRow;
export async function listUsers<Select extends AvailableKeys[] = ['name', 'role']>(
  select: Select = ['name', 'role'] as Select
) {
  type SelectedKeys = (typeof select)[number];
  return sql<Pick<UserRow, SelectedKeys>>`
    SELECT ${sql.identifier(select)}
    FROM user FINAL
    ORDER BY created_at DESC
  `;
}

type GetUserByEmail<Select extends AvailableKeys[] = ['name', 'role']> = {
  select: Select;
  email: string;
};
export async function getUserByEmail<Select extends AvailableKeys[] = ['name', 'role']>({
  email,
  select = ['name', 'role'] as Select
}: GetUserByEmail<Select>) {
  type SelectedKeys = (typeof select)[number];
  const result = await sql<Pick<UserRow, SelectedKeys> | undefined>`
    SELECT ${sql.identifier(select)}
    FROM user FINAL
    where email = ${email}
    ORDER BY created_at DESC
  `;
  return result[0] ?? null;
}

export async function deleteUserByEmail(userEmail: string) {
  await sql`DELETE FROM user where email = ${userEmail}`.command();
}
