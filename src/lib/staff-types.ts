export const SCHOOLS = [
  { code: "kg", name: "حضانة النور للمكفوفين", stage: "رياض أطفال" },
  { code: "primary", name: "النور الابتدائية للمكفوفين", stage: "ابتدائي" },
  { code: "prep", name: "النور الاعدادية المشتركة للمكفوفين", stage: "إعدادي" },
  { code: "secondary", name: "النور الثانوية المشتركة للمكفوفين", stage: "ثانوي" },
] as const;

export type SchoolCode = (typeof SCHOOLS)[number]["code"];

export type StaffSeed = {
  teacherCode: string;
  fullName: string;
  nationalId: string;
  appointmentDate: string;
  subject: string;
  financialGrade: string;
  financialGradeDate: string;
  jobGroup: string;
  currentJob: string;
  qualificationType: string;
  qualification: string;
  cadreJob: string;
  cadreDate: string;
  schoolCode: SchoolCode;
  category: string;
  underCadre: boolean;
};

export type StaffRow = {
  id: number;
  user_id: string;
  school_id: number;
  teacher_code: string;
  full_name: string;
  national_id: string;
  appointment_date: string | null;
  subject: string;
  financial_grade: string;
  financial_grade_date: string | null;
  job_group: string;
  current_job: string;
  qualification_type: string;
  qualification: string;
  cadre_job: string;
  cadre_date: string | null;
  category: string;
  under_cadre: boolean;
  data_errors: string;
  notes: string;
  created_at: string;
  updated_at: string;
  school_name: string;
  stage: string;
  school_code: string;
};

export type StaffInput = {
  id?: number;
  schoolCode: string;
  teacherCode: string;
  fullName: string;
  nationalId: string;
  appointmentDate: string;
  subject: string;
  financialGrade: string;
  financialGradeDate: string;
  jobGroup: string;
  currentJob: string;
  qualificationType: string;
  qualification: string;
  cadreJob: string;
  cadreDate: string;
  category: string;
  underCadre: boolean;
  dataErrors: string;
  notes: string;
};

export type Workspace = {
  user_id: string;
  directorate: string;
  administration: string;
  complex_name: string;
  seeded_at: string;
};

export type AuditRow = {
  id: number;
  action: string;
  summary: string;
  created_at: string;
  staff_id: number | null;
};

export const EDUCATION_GROUP = "المجموعة النوعية لوظائف أعضاء هيئة التعليم";
export const QUAL_TYPES = ["عليا", "دراسات عليا", "فوق المتوسطة", "متوسطة"] as const;
export const CATEGORIES = [
  "معلم",
  "أخصائي اجتماعي",
  "أخصائي صحافة وإعلام",
  "أمين مكتبة",
  "وكيل مدرسة",
  "فني معامل",
  "فني صيانة",
  "إداري",
  "مشرف نشاط",
] as const;
