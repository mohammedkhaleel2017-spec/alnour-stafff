import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { ensureDefaultAdmin } from "@/lib/seed-admin";

const credentialsSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(8),
  name: z.string().trim().optional(),
});

function readError(err: unknown): { message: string; code: string } {
  if (!err || typeof err !== "object") {
    return { message: String(err ?? ""), code: "" };
  }
  const e = err as {
    message?: string;
    code?: string;
    status?: string | number;
    body?: { message?: string; code?: string };
    cause?: { message?: string };
  };
  return {
    message: e.body?.message || e.message || e.cause?.message || "",
    code: e.body?.code || e.code || String(e.status ?? ""),
  };
}

function arabicAuthError(err: unknown): string {
  const { message, code } = readError(err);
  const text = `${code} ${message}`.toLowerCase();
  if (
    text.includes("pglite.data") ||
    text.includes("enoent") ||
    text.includes("database_url") ||
    text.includes("غير مهيأة")
  ) {
    return "قاعدة البيانات على الخادم لم تكن جاهزة. حدّث الصفحة بعد دقيقة ثم أنشئ الحساب مرة أخرى.";
  }
  if (text.includes("already exists") || text.includes("user_already_exists")) {
    return "هذا الحساب موجود بالفعل. استخدم تبويب «دخول».";
  }
  if (text.includes("invalid email or password") || text.includes("invalid_email_or_password")) {
    return "اسم المستخدم أو كلمة المرور غير صحيحة.";
  }
  if (text.includes("invalid email") || text.includes("invalid_email")) {
    return "اسم المستخدم غير صالح.";
  }
  if (text.includes("password") && (text.includes("invalid") || text.includes("short") || text.includes("8"))) {
    return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  }
  if (text.includes("invalid origin") || text.includes("missing or null origin")) {
    return "تعذر إتمام العملية من هذا الرابط. جرّب «متابعة عبر Google».";
  }
  if (message.trim()) return message;
  return "تعذر إتمام العملية. حاول مرة أخرى.";
}

export type AuthResult =
  | { ok: true; token: string | null; message?: string }
  | { ok: false; message: string; pendingApproval?: boolean };

async function runLocalAuth(
  kind: "up" | "in",
  data: z.infer<typeof credentialsSchema>,
): Promise<AuthResult> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  const { auth } = await import("@/lib/auth/server");
  assertSameSiteRequest();
  await ensureDefaultAdmin();

  const sql = await getSql();
  const emailLower = data.email.toLowerCase().trim();
  const name = data.name?.trim() || emailLower.split("@")[0] || "مستخدم";
  const isAdminEmail =
    emailLower.startsWith("admin@") ||
    emailLower.startsWith("admin.") ||
    emailLower.startsWith("admin_") ||
    emailLower === "admin@alnour.suez.edu.eg";

  try {
    if (kind === "up") {
      const result = await auth.api.signUpEmail({
        body: { email: emailLower, password: data.password, name },
      });

      const userRow = await sql.query<{ id: string }>(
        `select id from "user" where lower(email) = $1 limit 1`,
        [emailLower],
      );

      if (userRow[0]) {
        const userId = userRow[0].id;
        const role = isAdminEmail ? "admin" : "viewer";
        const isApproved = isAdminEmail ? true : false;
        await sql.query(
          `insert into user_approvals (user_id, role, is_approved, approved_at)
           values ($1, $2, $3, $4)
           on conflict (user_id) do update set
             role = $2, is_approved = $3, approved_at = $4`,
          [userId, role, isApproved, isApproved ? new Date() : null],
        );

        if (!isApproved) {
          return {
            ok: false,
            pendingApproval: true,
            message:
              "تم إنشاء الحساب بنجاح! لكن الدخول يتطلب موافقة الأدمن (مدير المدرسة). يرجى التواصل مع الإدارة لتفعيل الحساب.",
          };
        }
      }

      return { ok: true, token: result.token ?? null };
    }

    // Kind is 'in' (Sign in)
    const result = await auth.api.signInEmail({
      body: { email: emailLower, password: data.password },
    });

    const userRow = await sql.query<{ id: string; email: string }>(
      `select id, email from "user" where lower(email) = $1 limit 1`,
      [emailLower],
    );

    if (userRow[0]) {
      const userId = userRow[0].id;
      // Admin is always approved
      if (isAdminEmail) {
        await sql.query(
          `insert into user_approvals (user_id, role, is_approved, approved_at)
           values ($1, 'admin', true, now())
           on conflict (user_id) do update set role = 'admin', is_approved = true`,
          [userId],
        );
        return { ok: true, token: result.token ?? null };
      }

      const approval = await sql.query<{ is_approved: boolean | null }>(
        `select is_approved from user_approvals where user_id = $1`,
        [userId],
      );

      if (!approval[0] || !approval[0].is_approved) {
        return {
          ok: false,
          pendingApproval: true,
          message:
            "حسابك قيد المراجعة: في انتظار موافقة الأدمن (مدير المدرسة) لتفعيل الدخول.",
        };
      }
    }

    return { ok: true, token: result.token ?? null };
  } catch (err) {
    return { ok: false, message: arabicAuthError(err) };
  }
}

export const signUpLocal = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => runLocalAuth("up", data));

export const signInLocal = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => runLocalAuth("in", data));
