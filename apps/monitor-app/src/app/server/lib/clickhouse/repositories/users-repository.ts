import { sql } from '@/app/server/lib/clickhouse/client';

export type InsertUserRow = {
  username: string;
  email: string;
  role: 'admin' | 'user';
};

type InsertUsers = [InsertUserRow, ...InsertUserRow[]];

export async function insertUser(users: InsertUsers) {
  const rows = users.map((user) => [user.username, user.email, user.role, Date.now()]);

  await sql`
    INSERT INTO user (
      name,
      email,
      role,
      created_at
    )
    VALUES ${sql.values(rows, ['String', 'String', 'String', 'DateTime64(3)'])}
  `;
}
