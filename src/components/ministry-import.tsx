import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { importStaffRows } from "@/lib/staff-server";
import { Button } from "./ui/button";
import { Card, CardHint, CardTitle } from "./ui/card";

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const norm = (v: unknown) =>
  clean(v)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s_\-./()\\[\]{}:،,]+/g, "");

/** أسماء أعمدة شائعة في ملفات بوابة المعلم / كشوف الوزارة */
const aliases: Record<string, string[]> = {
  teacherCode: [
    "كودالمعلم",
    "كودالموظف",
    "كودالعامل",
    "الكود",
    "كود",
    "teacher_code",
    "teachercode",
    "code",
    "employeecode",
  ],
  fullName: [
    "الاسم",
    "اسمالمعلم",
    "اسمالموظف",
    "اسمالعامل",
    "الاسمكامل",
    "الاسمرباعي",
    "fullname",
    "name",
  ],
  nationalId: [
    "الرقمالقومي",
    "الرقمالقومى",
    "الرقم",
    "رقمقومي",
    "nationalid",
    "nid",
    "id",
  ],
  school: [
    "جهةالعمل",
    "المدرسة",
    "المدرسه",
    "جهةالعملالحالية",
    "جههالعمل",
    "school",
    "schoolname",
    "workplace",
  ],
  stage: ["المرحلة", "المرحله", "stage", "level"],
  appointmentDate: [
    "تاريخالتعيين",
    "التعيين",
    "تاريخالتعيينبالترقية",
    "appointmentdate",
    "hiredate",
  ],
  subject: [
    "مادةالتدريس",
    "المادة",
    "التخصص",
    "الماده",
    "subject",
    "specialty",
  ],
  financialGrade: [
    "الدرجةالمالية",
    "الدرجهالماليه",
    "الدرجة",
    "الدرجه",
    "financialgrade",
    "grade",
  ],
  financialGradeDate: [
    "تاريخالدرجة",
    "تاريخالدرجه",
    "تاريخالدرجةالمالية",
    "financialgradedate",
  ],
  jobGroup: [
    "المجموعةالنوعية",
    "المجموعهالنوعيه",
    "المجموعة",
    "jobgroup",
    "group",
  ],
  currentJob: [
    "الوظيفةالحالية",
    "الوظيفهالحاليه",
    "الوظيفة",
    "الوظيفه",
    "currentjob",
    "job",
    "position",
  ],
  qualificationType: [
    "نوعالمؤهل",
    "qualificationtype",
    "qualtype",
  ],
  qualification: [
    "المؤهل",
    "المؤهلالدراسي",
    "qualification",
    "degree",
  ],
  cadreJob: [
    "الوظيفةعلىالكادر",
    "الوظيفهعلىالكادر",
    "وظيفةالكادر",
    "cadrejob",
    "cadre",
  ],
  cadreDate: ["تاريخالكادر", "cadredate"],
  category: [
    "التصنيف",
    "الفئة",
    "الفئه",
    "category",
    "type",
  ],
  underCadre: [
    "مخاطببالكادر",
    "علىالكادر",
    "عليالكادر",
    "يخاطببالكادر",
    "undercadre",
    "oncadre",
  ],
};

function valueFor(row: Record<string, unknown>, key: string): string {
  const entries = Object.entries(row);
  const keys = (aliases[key] ?? []).map(norm);
  const found = entries.find(([k]) => keys.includes(norm(k)));
  return clean(found?.[1]);
}

function schoolCodeFor(value: string, stage: string): string {
  const s = `${value} ${stage}`;
  if (/حضانة|رياض|kg|kindergarten/i.test(s)) return "kg";
  if (/ابتدائ|primary/i.test(s)) return "primary";
  if (/إعداد|اعداد|prep|preparatory/i.test(s)) return "prep";
  if (/ثانوي|secondary/i.test(s)) return "secondary";
  if (/حضانة النور/i.test(s)) return "kg";
  if (/الابتدائية|الابتدائيه/i.test(s)) return "primary";
  if (/الاعدادية|الإعدادية/i.test(s)) return "prep";
  if (/الثانوية|الثانويه/i.test(s)) return "secondary";
  return "primary";
}

function boolValue(v: string): boolean {
  return /نعم|true|1|على\s*الكادر|علي\s*الكادر|مخاطب/i.test(v);
}

/** يحوّل تواريخ Excel / نص عربي إلى ISO yyyy-mm-dd إن أمكن */
function parseDate(v: string): string {
  const raw = clean(v);
  if (!raw) return "";
  if (/^\d{5}(\.\d+)?$/.test(raw)) {
    const serial = parseFloat(raw);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + serial * 86400000);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  const m1 = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m1) {
    let [, d, m, y] = m1;
    if (y.length === 2) y = `20${y}`;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

type MappedRow = {
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

function mapRows(rows: Record<string, unknown>[]): MappedRow[] {
  return rows
    .map((r) => ({
      schoolCode: schoolCodeFor(valueFor(r, "school"), valueFor(r, "stage")),
      teacherCode: valueFor(r, "teacherCode"),
      fullName: valueFor(r, "fullName"),
      nationalId: valueFor(r, "nationalId").replace(/\D/g, "").slice(0, 14),
      appointmentDate: parseDate(valueFor(r, "appointmentDate")),
      subject: valueFor(r, "subject"),
      financialGrade: valueFor(r, "financialGrade"),
      financialGradeDate: parseDate(valueFor(r, "financialGradeDate")),
      jobGroup: valueFor(r, "jobGroup"),
      currentJob: valueFor(r, "currentJob"),
      qualificationType: valueFor(r, "qualificationType"),
      qualification: valueFor(r, "qualification"),
      cadreJob: valueFor(r, "cadreJob"),
      cadreDate: parseDate(valueFor(r, "cadreDate")),
      category: valueFor(r, "category") || "معلم",
      underCadre: boolValue(valueFor(r, "underCadre")),
      dataErrors: "",
      notes: "",
    }))
    .filter((r) => r.teacherCode && r.fullName);
}

export function MinistryImport() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<MappedRow[] | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus("جارٍ قراءة ملف وزارة التربية والتعليم…");
    setPreview(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("الملف لا يحتوي على أي ورقة عمل.");
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      });
      if (!rows.length) {
        throw new Error("الملف فارغ. تأكد أنك صدّرت البيانات من لوحة بوابة المعلم.");
      }
      const first = rows[0] ?? {};
      setHeaders(Object.keys(first));
      const mapped = mapRows(rows);
      setRawCount(rows.length);
      if (!mapped.length) {
        throw new Error(
          "لم أجد صفوفًا تحتوي على «كود المعلم» و«الاسم». تأكد أن الصف الأول عناوين أعمدة، وأن الملف صادر من بوابة المعلم أو كشف الوزارة.",
        );
      }
      setPreview(mapped);
      setStatus(
        `تمت القراءة: ${mapped.length} سجل صالح من أصل ${rows.length}. راجع المعاينة ثم اضغط «تأكيد الاستيراد».`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر قراءة الملف.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!preview?.length) return;
    setBusy(true);
    setStatus("جارٍ استيراد البيانات إلى قاعدة النظام…");
    try {
      const result = await importStaffRows({ data: { rows: preview } });
      setStatus(
        `تم الاستيراد بنجاح: ${result.inserted} إضافة و${result.updated} تحديث من أصل ${rawCount} صف في الملف.`,
      );
      setPreview(null);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر استيراد الملف.");
    } finally {
      setBusy(false);
    }
  }

  const previewSlice = useMemo(() => (preview ?? []).slice(0, 8), [preview]);

  return (
    <Card className="space-y-3">
      <CardTitle>الربط مع بوابة وزارة التربية والتعليم</CardTitle>
      <CardHint>
        لا يوجد واجهة برمجية (API) عامة لتصدير بيانات المعلمين تلقائيًا. الطريقة الرسمية والآمنة:
        افتح بوابة المعلم بحسابك الرسمي ← صدّر/نزّل كشف البيانات المسموح به (Excel أو CSV) ← ارفعه هنا.
        لا يُحفظ أي رقم سري أو كلمة مرور للوزارة داخل هذا التطبيق.
      </CardHint>

      <ol className="list-decimal space-y-1 pr-5 text-sm text-muted">
        <li>
          اضغط «فتح بوابة المعلم» وسجّل الدخول بالرقم القومي / كود المعلم / الرقم السري الصادر من الإدارة.
        </li>
        <li>
          من لوحة التحكم أو شاشة العاملين بالمدرسة صدّر الكشف إلى Excel (إن وُجد زر تصدير)، أو استخدم إضافة المتصفح
          «أبو حفصة العاملين جاهزين» إن كنت تعتمدها محليًا.
        </li>
        <li>ارجع هنا وارفع الملف. ستظهر معاينة قبل الحفظ النهائي.</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            window.open(
              "https://teacher.emis.gov.eg/dashboard",
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          فتح بوابة المعلم
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              "https://teacher.emis.gov.eg/login",
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          صفحة تسجيل الدخول
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-bg-elevated">
          {busy ? "جارٍ المعالجة…" : "استيراد ملف الوزارة (Excel / CSV)"}
          <input
            className="hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {preview && preview.length > 0 ? (
          <Button disabled={busy} onClick={() => void confirmImport()}>
            تأكيد الاستيراد ({preview.length} سجل)
          </Button>
        ) : null}
        {preview ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setPreview(null);
              setStatus("");
            }}
          >
            إلغاء المعاينة
          </Button>
        ) : null}
      </div>

      {headers.length > 0 && !preview ? (
        <p className="text-xs text-muted">
          أعمدة الملف المقروءة: {headers.slice(0, 12).join(" · ")}
          {headers.length > 12 ? "…" : ""}
        </p>
      ) : null}

      {status ? (
        <p className="rounded-md bg-bg-elevated p-3 text-sm">{status}</p>
      ) : null}

      {previewSlice.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-right text-xs">
            <thead className="bg-bg-elevated">
              <tr>
                <th className="p-2">الكود</th>
                <th className="p-2">الاسم</th>
                <th className="p-2">الرقم القومي</th>
                <th className="p-2">جهة العمل</th>
                <th className="p-2">الوظيفة</th>
                <th className="p-2">المادة</th>
              </tr>
            </thead>
            <tbody>
              {previewSlice.map((r) => (
                <tr key={`${r.teacherCode}-${r.nationalId}`} className="border-t border-border">
                  <td className="p-2 font-mono">{r.teacherCode}</td>
                  <td className="p-2">{r.fullName}</td>
                  <td className="p-2 font-mono">{r.nationalId || "—"}</td>
                  <td className="p-2">{r.schoolCode}</td>
                  <td className="p-2">{r.currentJob || "—"}</td>
                  <td className="p-2">{r.subject || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(preview?.length ?? 0) > previewSlice.length ? (
            <p className="p-2 text-xs text-muted">
              عرض {previewSlice.length} من {preview!.length} سجل…
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
