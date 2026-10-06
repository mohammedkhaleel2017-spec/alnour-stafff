import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, authMiddlewareAllowUnapproved } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureDefaultAdmin } from "@/lib/seed-admin";

export type UserApprovalItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  is_approved: boolean;
  approved_at: string | null;
  created_at: string;
};

export type CurrentUserRoleInfo = {
  userId: string;
  role: "admin" | "viewer";
  isApproved: boolean;
  isAdmin: boolean;
  pendingApprovalsCount: number;
};

export async function checkUserRole(userId: string): Promise<{
  role: "admin" | "viewer";
  isApproved: boolean;
  isAdmin: boolean;
}> {
  await ensureDefaultAdmin();
  const sql = await getSql();

  // If userId is dev-user, allow admin
  if (userId === "dev-user") {
    return { role: "admin", isApproved: true, isAdmin: true };
  }

  const rows = await sql.query<{
    email: string;
    role: string | null;
    is_approved: boolean | null;
  }>(
    `select u.email, ua.role, ua.is_approved
     from "user" u
     left join user_approvals ua on ua.user_id = u.id
     where u.id = $1 limit 1`,
    [userId],
  );

  if (!rows[0]) {
    return { role: "viewer", isApproved: false, isAdmin: false };
  }

  const email = (rows[0].email || "").toLowerCase();
  const isAdminEmail =
    email.startsWith("admin") ||
    email.includes("admin@") ||
    email === "admin@alnour.suez.edu.eg";
  const isRoleAdmin = rows[0].role === "admin";
  const isAdmin = isAdminEmail || isRoleAdmin;
  const role: "admin" | "viewer" = isAdmin ? "admin" : "viewer";
  const isApproved = isAdmin ? true : Boolean(rows[0].is_approved);

  if (isAdmin && (rows[0].role !== "admin" || !rows[0].is_approved)) {
    await sql.query(
      `insert into user_approvals (user_id, role, is_approved, approved_at)
       values ($1, 'admin', true, now())
       on conflict (user_id) do update set role = 'admin', is_approved = true, approved_at = coalesce(user_approvals.approved_at, now())`,
      [userId],
    );
  }

  return {
    role,
    isApproved,
    isAdmin,
  };
}

export async function requireAdmin(userId: string): Promise<void> {
  const { isAdmin } = await checkUserRole(userId);
  if (!isAdmin) {
    throw new Error("غير مصرح: هذه العملية مخصصة لمدير النظام (الأدمن) فقط.");
  }
}

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .middleware([authMiddlewareAllowUnapproved])
  .handler(async ({ context }): Promise<CurrentUserRoleInfo> => {
    const sql = await getSql();
    await ensureDefaultAdmin();
    const { role, isApproved, isAdmin } = await checkUserRole(context.userId);

    let pendingApprovalsCount = 0;
    if (isAdmin) {
      const pendingRows = await sql.query<{ count: number }>(
        `select count(*)::int as count from "user" u
         left join user_approvals ua on ua.user_id = u.id
         where coalesce(ua.is_approved, false) = false
           and u.email not like 'admin@%'`,
      );
      pendingApprovalsCount = pendingRows[0]?.count ?? 0;
    }

    return {
      userId: context.userId,
      role,
      isApproved,
      isAdmin,
      pendingApprovalsCount,
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserApprovalItem[]> => {
    await requireAdmin(context.userId);
    const sql = await getSql();

    const rows = await sql.query<{
      id: string;
      name: string;
      email: string;
      role: string | null;
      is_approved: boolean | null;
      approved_at: string | null;
      created_at: string;
    }>(
      `select u.id, u.name, u.email,
              u."createdAt"::text as created_at,
              coalesce(ua.role, 'viewer') as role,
              coalesce(ua.is_approved, false) as is_approved,
              ua.approved_at::text as approved_at
       from "user" u
       left join user_approvals ua on ua.user_id = u.id
       order by u."createdAt" desc`,
    );

    return rows.map((r) => {
      const emailLower = (r.email || "").toLowerCase();
      const isAdminEmail =
        emailLower.startsWith("admin@") ||
        emailLower.startsWith("admin.") ||
        emailLower.startsWith("admin_") ||
        emailLower === "admin@alnour.suez.edu.eg";
      const isRoleAdmin = r.role === "admin";
      const isAdmin = isAdminEmail || isRoleAdmin;
      const isApproved = isAdmin ? true : Boolean(r.is_approved);
      const role: "admin" | "viewer" = isAdmin ? "admin" : "viewer";
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role,
        is_approved: isApproved,
        approved_at: r.approved_at,
        created_at: r.created_at,
      };
    });
  });

export const approveUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();

    const existing = await sql.query<{ user_id: string }>(
      `select user_id from user_approvals where user_id = $1`,
      [data.userId],
    );

    if (existing[0]) {
      await sql.query(
        `update user_approvals set is_approved = true, approved_at = now() where user_id = $1`,
        [data.userId],
      );
    } else {
      await sql.query(
        `insert into user_approvals (user_id, role, is_approved, approved_at)
         values ($1, 'viewer', true, now())`,
        [data.userId],
      );
    }

    return { ok: true };
  });

export const rejectUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();

    // Prevent rejecting own admin account
    if (data.userId === context.userId) {
      throw new Error("لا يمكن إلغاء تفعيل حساب الأدمن الحالي.");
    }

    await sql.query(
      `update user_approvals set is_approved = false, approved_at = null where user_id = $1`,
      [data.userId],
    );

    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1), role: z.enum(["admin", "viewer"]) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();

    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("لا يمكن إزالة صلاحية الأدمن عن حسابك الحالي.");
    }

    const existing = await sql.query<{ user_id: string }>(
      `select user_id from user_approvals where user_id = $1`,
      [data.userId],
    );

    const isNowAdmin = data.role === "admin";
    if (existing[0]) {
      await sql.query(
        `update user_approvals set role = $1, is_approved = case when $1 = 'admin' then true else is_approved end, approved_at = case when $1 = 'admin' then coalesce(approved_at, now()) else approved_at end where user_id = $2`,
        [data.role, data.userId],
      );
    } else {
      await sql.query(
        `insert into user_approvals (user_id, role, is_approved, approved_at)
         values ($1, $2, $3, $4)`,
        [data.userId, data.role, isNowAdmin, isNowAdmin ? new Date() : null],
      );
    }

    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();

    if (data.userId === context.userId) {
      throw new Error("لا يمكن حذف حسابك الحالي.");
    }

    await sql.query(`delete from "user" where id = $1`, [data.userId]);
    return { ok: true };
  });
