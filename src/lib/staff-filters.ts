import { parseEgyptianNid } from "./national-id";
import type { StaffRow } from "./staff-types";
import { yearsBetween } from "./utils";

export type StaffQueryId =
  | "all"
  | "teachers"
  | "senior"
  | "expert"
  | "first"
  | "first-a"
  | "assistant"
  | "not-cadre"
  | "retirement"
  | "before-2000"
  | "pedagogy"
  | "specialists";

export const SAVED_QUERIES: { id: StaffQueryId; title: string; hint: string }[] = [
  { id: "all", title: "جميع العاملين", hint: "الكشف الكامل للمجمع" },
  { id: "teachers", title: "المعلمون", hint: "أعضاء هيئة التعليم في حجرات الدراسة" },
  { id: "senior", title: "كبار المعلمين", hint: "الدرجة الحالية كبير معلمين" },
  { id: "expert", title: "المعلم الخبير", hint: "الدرجة الحالية معلم خبير" },
  { id: "first", title: "معلم أول", hint: "الوظيفة معلم أول" },
  { id: "first-a", title: "معلم أول أ", hint: "الوظيفة معلم أول أ" },
  { id: "assistant", title: "معلم مساعد", hint: "الوظيفة معلم مساعد" },
  { id: "not-cadre", title: "غير مخاطبين بكادر المعلم", hint: "وظائف فنية وإدارية خارج الكادر" },
  { id: "retirement", title: "يقتربون من المعاش", hint: "خلال خمس سنوات وفق الرقم القومي" },
  { id: "before-2000", title: "معينون قبل عام 2000", hint: "أقدمية التعيين" },
  { id: "pedagogy", title: "حاصلون على تأهيل تربوي", hint: "المؤهل يذكر برنامج التأهيل" },
  { id: "specialists", title: "الأخصائيون وأمناء المكتبات", hint: "غير التدريس الصفي" },
];

export function matchesQuery(row: StaffRow, query: StaffQueryId | undefined): boolean {
  if (!query || query === "all") return true;
  if (query === "teachers") return row.category === "معلم";
  if (query === "senior") return row.cadre_job.includes("كبير معلمين") || row.current_job.includes("كبير معلمين");
  if (query === "expert") return row.cadre_job.includes("معلم خبير") || row.current_job.includes("معلم خبير");
  if (query === "first") {
    const jobs = `${row.cadre_job} ${row.current_job}`;
    return jobs.includes("معلم أول") && !jobs.includes("معلم أول أ");
  }
  if (query === "first-a") return row.cadre_job.includes("معلم أول أ") || row.current_job.includes("معلم أول أ");
  if (query === "assistant") return row.cadre_job.includes("معلم مساعد") || row.current_job.includes("معلم مساعد");
  if (query === "not-cadre") return !row.under_cadre;
  if (query === "retirement") {
    const info = parseEgyptianNid(row.national_id);
    return !!info && info.yearsToRetirement <= 5;
  }
  if (query === "before-2000") {
    const years = yearsBetween(row.appointment_date, new Date("2000-01-01"));
    return (row.appointment_date ?? "") < "2000-01-01" || (years != null && years > 0);
  }
  if (query === "pedagogy") return row.qualification.includes("التأهيل التربوي");
  if (query === "specialists") {
    return ["أخصائي اجتماعي", "أخصائي صحافة وإعلام", "أمين مكتبة", "وكيل مدرسة"].includes(row.category);
  }
  return true;
}

export function searchStaff(rows: StaffRow[], term: string): StaffRow[] {
  const q = term.trim();
  if (!q) return rows;
  return rows.filter((row) =>
    [row.full_name, row.teacher_code, row.national_id, row.subject, row.current_job, row.school_name, row.cadre_job]
      .join(" ")
      .includes(q),
  );
}
