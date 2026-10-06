import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";

export const DEFAULT_ADMIN_EMAIL = "admin@alnour.suez.edu.eg";
export const DEFAULT_ADMIN_PASSWORD = "Alnour@123";
export const DEFAULT_ADMIN_NAME = "مدير المدرسة";

export async function ensureDefaultAdmin(): Promise<void> {
  const sql = await getSql();

  // Ensure user_approvals table exists
  await sql.query(`
    create table if not exists user_approvals (
      user_id text primary key references "user"(id) on delete cascade,
      role text not null default 'viewer',
      is_approved boolean not null default false,
      approved_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);

  const existing = await sql.query<{ id: string }>(
    `select id from "user" where email = $1 limit 1`,
    [DEFAULT_ADMIN_EMAIL],
  );

  let adminUserId = existing[0]?.id;

  if (!adminUserId) {
    adminUserId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const password = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    const now = new Date();

    await sql.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, $4, $4)`,
      [adminUserId, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, now],
    );
    await sql.query(
      `insert into "account" (
         id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
       ) values ($1, $2, 'credential', $3, $4, $5, $5)`,
      [accountId, adminUserId, adminUserId, password, now],
    );
  }

  // Ensure approval record exists for admin
  const approval = await sql.query<{ user_id: string }>(
    `select user_id from user_approvals where user_id = $1`,
    [adminUserId],
  );

  if (!approval[0]) {
    await sql.query(
      `insert into user_approvals (user_id, role, is_approved, approved_at)
       values ($1, 'admin', true, now())`,
      [adminUserId],
    );
  } else {
    await sql.query(
      `update user_approvals set role = 'admin', is_approved = true, approved_at = coalesce(approved_at, now())
       where user_id = $1`,
      [adminUserId],
    );
  }
}
