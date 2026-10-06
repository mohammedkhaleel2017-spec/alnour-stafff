import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-server";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { parseEgyptianNid } from "@/lib/national-id";
import { OFFICIAL_STAFF } from "@/lib/staff-seed";
import {
  SCHOOLS,
  type AuditRow,
  type StaffInput,
  type StaffRow,
  type Workspace,
} from "@/lib/staff-types";
import { yearsBetween } from "@/lib/utils";

export const CENTRAL_WORKSPACE_ID = "central_school_workspace";

function emptyToNull(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

const staffSelect = `s.id, s.user_id, s.school_id, s.teacher_code, s.full_name, s.national_id,
  s.appointment_date::text as appointment_date,
  s.subject, s.financial_grade,
  s.financial_grade_date::text as financial_grade_date,
  s.job_group, s.current_job, s.qualification_type, s.qualification,
  s.cadre_job, s.cadre_date::text as cadre_date,
  s.category, s.under_cadre, s.data_errors, s.notes,
  s.created_at::text as created_at, s.updated_at::text as updated_at,
  sc.name as school_name, sc.stage as stage, sc.code as school_code`;

async function fetchStaffSafe(sql: Sql): Promise<StaffRow[]> {
  return sql.query<StaffRow>(
    `select ${staffSelect}
     from staff s
     join schools sc on sc.id = s.school_id
     where s.user_id = $1
     order by sc.id, s.id`,
    [CENTRAL_WORKSPACE_ID],
  );
}

async function ensureWorkspace(sql: Sql): Promise<Workspace> {
  const existing = await sql<Workspace>`
    select user_id, directorate, administration, complex_name, seeded_at::text as seeded_at
    from workspaces where user_id = ${CENTRAL_WORKSPACE_ID}
  `;
  if (existing[0]) return existing[0];

  await sql`
    insert into workspaces (user_id, directorate, administration, complex_name)
    values (${CENTRAL_WORKSPACE_ID}, 'السويس', 'شمال السويس', 'مجمع مدارس النور للمكفوفين')
  `;

  for (const school of SCHOOLS) {
    await sql`
      insert into schools (user_id, code, name, stage)
      values (${CENTRAL_WORKSPACE_ID}, ${school.code}, ${school.name}, ${school.stage})
    `;
  }

  const schoolRows = await sql<{ id: number; code: string }>`
    select id, code from schools where user_id = ${CENTRAL_WORKSPACE_ID}
  `;
  const schoolIds = Object.fromEntries(schoolRows.map((s) => [s.code, s.id]));

  for (const person of OFFICIAL_STAFF) {
    const schoolId = schoolIds[person.schoolCode];
    if (!schoolId) continue;
    await sql`
      insert into staff (
        user_id, school_id, teacher_code, full_name, national_id,
        appointment_date, subject, financial_grade, financial_grade_date,
        job_group, current_job, qualification_type, qualification,
        cadre_job, cadre_date, category, under_cadre, data_errors, notes
      ) values (
        ${CENTRAL_WORKSPACE_ID}, ${schoolId}, ${person.teacherCode}, ${person.fullName}, ${person.nationalId},
        ${emptyToNull(person.appointmentDate)}, ${person.subject}, ${person.financialGrade}, ${emptyToNull(person.financialGradeDate)},
        ${person.jobGroup}, ${person.currentJob}, ${person.qualificationType}, ${person.qualification},
        ${person.cadreJob}, ${emptyToNull(person.cadreDate)}, ${person.category}, ${person.underCadre}, '', ''
      )
    `;
  }

  await sql`
    insert into audit_log (user_id, action, summary)
    values (${CENTRAL_WORKSPACE_ID}, 'seed', 'تم تحميل بيانات العاملين من كشوف المراجعة الرسمية')
  `;

  const created = await sql<Workspace>`
    select user_id, directorate, administration, complex_name, seeded_at::text as seeded_at
    from workspaces where user_id = ${CENTRAL_WORKSPACE_ID}
  `;
  return created[0]!;
}

const staffInputSchema = z.object({
  id: z.number().optional(),
  schoolCode: z.string().min(1),
  teacherCode: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  nationalId: z.string().trim(),
  appointmentDate: z.string(),
  subject: z.string(),
  financialGrade: z.string(),
  financialGradeDate: z.string(),
  jobGroup: z.string(),
  currentJob: z.string(),
  qualificationType: z.string(),
  qualification: z.string(),
  cadreJob: z.string(),
  cadreDate: z.string(),
  category: z.string(),
  underCadre: z.boolean(),
  dataErrors: z.string(),
  notes: z.string(),
});

const importedStaffSchema = z.object({
  schoolCode: z.string().min(1),
  teacherCode: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  nationalId: z.string().trim().default(""),
  appointmentDate: z.string().default(""),
  subject: z.string().default(""),
  financialGrade: z.string().default(""),
  financialGradeDate: z.string().default(""),
  jobGroup: z.string().default(""),
  currentJob: z.string().default(""),
  qualificationType: z.string().default(""),
  qualification: z.string().default(""),
  cadreJob: z.string().default(""),
  cadreDate: z.string().default(""),
  category: z.string().default("معلم"),
  underCadre: z.boolean().default(false),
  dataErrors: z.string().default(""),
  notes: z.string().default(""),
});

export const importStaffRows = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ rows: z.array(importedStaffSchema).min(1).max(5000) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await ensureWorkspace(sql);
    const schools = await sql<{ id: number; code: string; name: string }>`
      select id, code, name from schools where user_id = ${CENTRAL_WORKSPACE_ID}
    `;
    const schoolMap = new Map(schools.map((s) => [s.code, s.id]));
    let inserted = 0;
    let updated = 0;
    for (const raw of data.rows) {
      const row = importedStaffSchema.parse(raw);
      const schoolId = schoolMap.get(row.schoolCode);
      if (!schoolId) continue;
      const existing = await sql<{ id: number }>`
        select id from staff where user_id = ${CENTRAL_WORKSPACE_ID}
          and (teacher_code = ${row.teacherCode} or (${row.nationalId} <> '' and national_id = ${row.nationalId}))
        limit 1
      `;
      if (existing[0]) {
        await sql`
          update staff set school_id=${schoolId}, teacher_code=${row.teacherCode}, full_name=${row.fullName}, national_id=${row.nationalId},
            appointment_date=${emptyToNull(row.appointmentDate)}, subject=${row.subject}, financial_grade=${row.financialGrade},
            financial_grade_date=${emptyToNull(row.financialGradeDate)}, job_group=${row.jobGroup}, current_job=${row.currentJob},
            qualification_type=${row.qualificationType}, qualification=${row.qualification}, cadre_job=${row.cadreJob},
            cadre_date=${emptyToNull(row.cadreDate)}, category=${row.category}, under_cadre=${row.underCadre},
            data_errors=${row.dataErrors}, notes=${row.notes}, updated_at=now()
          where id=${existing[0].id} and user_id=${CENTRAL_WORKSPACE_ID}
        `;
        updated++;
      } else {
        await sql`
          insert into staff (user_id, school_id, teacher_code, full_name, national_id, appointment_date, subject, financial_grade,
            financial_grade_date, job_group, current_job, qualification_type, qualification, cadre_job, cadre_date, category,
            under_cadre, data_errors, notes)
          values (${CENTRAL_WORKSPACE_ID}, ${schoolId}, ${row.teacherCode}, ${row.fullName}, ${row.nationalId}, ${emptyToNull(row.appointmentDate)},
            ${row.subject}, ${row.financialGrade}, ${emptyToNull(row.financialGradeDate)}, ${row.jobGroup}, ${row.currentJob},
            ${row.qualificationType}, ${row.qualification}, ${row.cadreJob}, ${emptyToNull(row.cadreDate)}, ${row.category},
            ${row.underCadre}, ${row.dataErrors}, ${row.notes})
        `;
        inserted++;
      }
    }
    await sql`insert into audit_log (user_id, action, summary) values (${context.userId}, 'import', ${`استيراد بيانات من بوابة وزارة التربية والتعليم: ${inserted} إضافة، ${updated} تحديث`})`;
    return { ok: true, inserted, updated, total: inserted + updated };
  });

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return ensureWorkspace(sql);
  });

export const listSchools = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    await ensureWorkspace(sql);
    return sql<{ id: number; code: string; name: string; stage: string }>`
      select id, code, name, stage from schools where user_id = ${CENTRAL_WORKSPACE_ID} order by id
    `;
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    await ensureWorkspace(sql);
    return fetchStaffSafe(sql);
  });

export const getStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureWorkspace(sql);
    const rows = await sql.query<StaffRow>(
      `select ${staffSelect}
       from staff s
       join schools sc on sc.id = s.school_id
       where s.user_id = $1 and s.id = $2`,
      [CENTRAL_WORKSPACE_ID, data.id],
    );
    return rows[0] ?? null;
  });

export const saveStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(staffInputSchema)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await ensureWorkspace(sql);
    const school = await sql<{ id: number }>`
      select id from schools where user_id = ${CENTRAL_WORKSPACE_ID} and code = ${data.schoolCode}
    `;
    const schoolId = school[0]?.id;
    if (!schoolId) throw new Error("جهة العمل غير موجودة");

    const dup = data.id
      ? await sql.query<{ id: number }>(
          "select id from staff where user_id = $1 and teacher_code = $2 and id <> $3",
          [CENTRAL_WORKSPACE_ID, data.teacherCode, data.id],
        )
      : await sql.query<{ id: number }>(
          "select id from staff where user_id = $1 and teacher_code = $2",
          [CENTRAL_WORKSPACE_ID, data.teacherCode],
        );
    if (dup[0]) throw new Error("كود المعلم مسجل مسبقاً");

    if (data.id) {
      await sql`
        update staff set
          school_id = ${schoolId},
          teacher_code = ${data.teacherCode},
          full_name = ${data.fullName},
          national_id = ${data.nationalId},
          appointment_date = ${emptyToNull(data.appointmentDate)},
          subject = ${data.subject},
          financial_grade = ${data.financialGrade},
          financial_grade_date = ${emptyToNull(data.financialGradeDate)},
          job_group = ${data.jobGroup},
          current_job = ${data.currentJob},
          qualification_type = ${data.qualificationType},
          qualification = ${data.qualification},
          cadre_job = ${data.cadreJob},
          cadre_date = ${emptyToNull(data.cadreDate)},
          category = ${data.category},
          under_cadre = ${data.underCadre},
          data_errors = ${data.dataErrors},
          notes = ${data.notes},
          updated_at = now()
        where id = ${data.id} and user_id = ${CENTRAL_WORKSPACE_ID}
      `;
      await sql`
        insert into audit_log (user_id, staff_id, action, summary)
        values (${context.userId}, ${data.id}, 'update', ${`تعديل بيانات ${data.fullName}`})
      `;
      return { id: data.id };
    }

    const inserted = await sql<{ id: number }>`
      insert into staff (
        user_id, school_id, teacher_code, full_name, national_id,
        appointment_date, subject, financial_grade, financial_grade_date,
        job_group, current_job, qualification_type, qualification,
        cadre_job, cadre_date, category, under_cadre, data_errors, notes
      ) values (
        ${CENTRAL_WORKSPACE_ID}, ${schoolId}, ${data.teacherCode}, ${data.fullName}, ${data.nationalId},
        ${emptyToNull(data.appointmentDate)}, ${data.subject}, ${data.financialGrade}, ${emptyToNull(data.financialGradeDate)},
        ${data.jobGroup}, ${data.currentJob}, ${data.qualificationType}, ${data.qualification},
        ${data.cadreJob}, ${emptyToNull(data.cadreDate)}, ${data.category}, ${data.underCadre}, ${data.dataErrors}, ${data.notes}
      ) returning id
    `;
    const id = inserted[0]!.id;
    await sql`
      insert into audit_log (user_id, staff_id, action, summary)
      values (${context.userId}, ${id}, 'create', ${`إضافة ${data.fullName}`})
    `;
    return { id };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const row = await sql<{ full_name: string }>`
      select full_name from staff where id = ${data.id} and user_id = ${CENTRAL_WORKSPACE_ID}
    `;
    await sql`delete from staff where id = ${data.id} and user_id = ${CENTRAL_WORKSPACE_ID}`;
    if (row[0]) {
      await sql`
        insert into audit_log (user_id, staff_id, action, summary)
        values (${context.userId}, ${data.id}, 'delete', ${`حذف ${row[0].full_name}`})
      `;
    }
    return { ok: true };
  });

export const restoreOfficialData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`delete from staff where user_id = ${CENTRAL_WORKSPACE_ID}`;
    await sql`delete from schools where user_id = ${CENTRAL_WORKSPACE_ID}`;
    await sql`delete from audit_log where user_id = ${CENTRAL_WORKSPACE_ID}`;
    await sql`delete from workspaces where user_id = ${CENTRAL_WORKSPACE_ID}`;
    await ensureWorkspace(sql);
    await sql`
      insert into audit_log (user_id, action, summary)
      values (${context.userId}, 'restore', 'استعادة كشوف المراجعة الرسمية بالكامل بواسطة الأدمن')
    `;
    return { ok: true, count: OFFICIAL_STAFF.length };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    await ensureWorkspace(sql);
    return sql<AuditRow>`
      select id, action, summary, created_at::text as created_at, staff_id
      from audit_log
      order by id desc
      limit 40
    `;
  });

export type DashboardData = {
  total: number;
  underCadre: number;
  notCadre: number;
  teachers: number;
  avgServiceYears: number;
  nearRetirement: number;
  byStage: { name: string; value: number }[];
  byRank: { name: string; value: number }[];
  byQualification: { name: string; value: number }[];
  byGender: { name: string; value: number }[];
};

function countBy(rows: string[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const key of rows) map.set(key, (map.get(key) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<DashboardData> => {
    const sql = await getSql();
    await ensureWorkspace(sql);
    const rows = await fetchStaffSafe(sql);
    const serviceYears = rows
      .map((r) => yearsBetween(r.appointment_date))
      .filter((n): n is number => n != null);
    const avgServiceYears =
      serviceYears.length === 0
        ? 0
        : Math.round((serviceYears.reduce((a, b) => a + b, 0) / serviceYears.length) * 10) / 10;
    return {
      total: rows.length,
      underCadre: rows.filter((r) => r.under_cadre).length,
      notCadre: rows.filter((r) => !r.under_cadre).length,
      teachers: rows.filter((r) => r.category === "معلم").length,
      avgServiceYears,
      nearRetirement: rows.filter((r) => {
        const info = parseEgyptianNid(r.national_id);
        return info != null && info.yearsToRetirement <= 5;
      }).length,
      byStage: countBy(rows.map((r) => r.stage)),
      byRank: countBy(rows.map((r) => r.cadre_job || r.current_job || "غير محدد")),
      byQualification: countBy(rows.map((r) => r.qualification_type || "غير محدد")),
      byGender: countBy(rows.map((r) => parseEgyptianNid(r.national_id)?.gender ?? "غير محدد")),
    };
  });

export function inputFromRow(row: StaffRow): StaffInput {
  return {
    id: row.id,
    schoolCode: row.school_code,
    teacherCode: row.teacher_code,
    fullName: row.full_name,
    nationalId: row.national_id,
    appointmentDate: row.appointment_date ?? "",
    subject: row.subject,
    financialGrade: row.financial_grade,
    financialGradeDate: row.financial_grade_date ?? "",
    jobGroup: row.job_group,
    currentJob: row.current_job,
    qualificationType: row.qualification_type,
    qualification: row.qualification,
    cadreJob: row.cadre_job,
    cadreDate: row.cadre_date ?? "",
    category: row.category,
    underCadre: row.under_cadre,
    dataErrors: row.data_errors,
    notes: row.notes,
  };
}
