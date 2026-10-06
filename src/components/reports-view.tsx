import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { useCurrentUserRole } from "@/lib/auth/use-current-user";
import { listAudit, listStaff, restoreOfficialData } from "@/lib/staff-server";
import { SCHOOLS } from "@/lib/staff-types";
import { csvEscape, downloadTextFile, formatIsoDate } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MinistryImport } from "./ministry-import";
import { Card, CardHint, CardTitle } from "./ui/card";
import { UserManagement } from "./user-management";

function toCsv(rows: Awaited<ReturnType<typeof listStaff>>): string {
  const header = [
    "م",
    "كود المعلم",
    "الاسم",
    "الرقم القومي",
    "جهة العمل",
    "المرحلة",
    "تاريخ التعيين",
    "مادة التدريس",
    "الدرجة المالية",
    "تاريخ الدرجة",
    "المجموعة النوعية",
    "الوظيفة الحالية",
    "نوع المؤهل",
    "المؤهل",
    "الوظيفة على الكادر",
    "تاريخ الكادر",
    "التصنيف",
    "مخاطب بالكادر",
  ];
  const lines = rows.map((r, i) =>
    [
      i + 1,
      r.teacher_code,
      r.full_name,
      r.national_id,
      r.school_name,
      r.stage,
      r.appointment_date ?? "",
      r.subject,
      r.financial_grade,
      r.financial_grade_date ?? "",
      r.job_group,
      r.current_job,
      r.qualification_type,
      r.qualification,
      r.cadre_job,
      r.cadre_date ?? "",
      r.category,
      r.under_cadre ? "نعم" : "لا",
    ]
      .map(csvEscape)
      .join(","),
  );
  return `\uFEFF${header.join(",")}\n${lines.join("\n")}`;
}

function exportXlsx(rows: Awaited<ReturnType<typeof listStaff>>) {
  const data = rows.map((r, i) => ({
    م: i + 1,
    "كود المعلم": r.teacher_code,
    الاسم: r.full_name,
    "الرقم القومي": r.national_id,
    "جهة العمل": r.school_name,
    المرحلة: r.stage,
    "تاريخ التعيين": r.appointment_date ?? "",
    "مادة التدريس": r.subject,
    "الدرجة المالية": r.financial_grade,
    "تاريخ الدرجة": r.financial_grade_date ?? "",
    "المجموعة النوعية": r.job_group,
    "الوظيفة الحالية": r.current_job,
    "نوع المؤهل": r.qualification_type,
    المؤهل: r.qualification,
    "الوظيفة على الكادر": r.cadre_job,
    "تاريخ الكادر": r.cadre_date ?? "",
    التصنيف: r.category,
    "مخاطب بالكادر": r.under_cadre ? "نعم" : "لا",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "العاملين");
  ws["!cols"] = Object.keys(data[0] ?? {}).map((k) => ({
    wch: Math.min(28, Math.max(10, k.length + 2)),
  }));
  XLSX.writeFile(wb, `العاملين-النور-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function ReportsView() {
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff() });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });
  const roleQuery = useCurrentUserRole();
  const isAdmin = roleQuery.data?.isAdmin ?? false;

  const restore = useMutation({
    mutationFn: () => restoreOfficialData(),
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
  });

  function exportCsv() {
    if (!staff.data) return;
    downloadTextFile(
      "العاملين-النور.csv",
      toCsv(staff.data),
      "text/csv;charset=utf-8",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">التقارير والكشوف</h1>
          <p className="text-sm text-muted">
            طباعة كشوف المراجعة أو تصدير الجداول لفتحها في أكسس وإكسل.
          </p>
        </div>
        {!isAdmin ? (
          <Badge tone="warn">وضع القراءة فقط: التصدير متاح والتعديل للأدمن</Badge>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-3">
          <CardTitle>كشوف المراجعة الرسمية</CardTitle>
          <CardHint>نموذج مطابق لعنوان المديرية والإدارة وجهة العمل للطباعة وPDF.</CardHint>
          <div className="flex flex-wrap gap-2">
            <Link to="/print">
              <Button>طباعة كشف المجمع</Button>
            </Link>
            {SCHOOLS.map((s) => (
              <Link key={s.code} to="/print" search={{ school: s.code } as never}>
                <Button variant="outline">{s.stage}</Button>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          <CardTitle>تصدير لأكسس / إكسل</CardTitle>
          <CardHint>
            ملف Excel (.xlsx) جاهز للفتح مباشرة، أو CSV بترميز عربي يمكن استيراده إلى Microsoft Access.
          </CardHint>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => staff.data && exportXlsx(staff.data)}
              disabled={!staff.data?.length}
            >
              تنزيل Excel (.xlsx)
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!staff.data?.length}>
              تنزيل CSV
            </Button>
          </div>
        </Card>
      </div>

      {/* Admin Only Operations */}
      {isAdmin ? (
        <>
          <MinistryImport />

          <Card className="space-y-3">
            <CardTitle>استعادة البيانات الرسمية</CardTitle>
            <CardHint>
              يعيد تحميل {staff.data?.length ?? 43} سجلاً من كشوف سبتمبر 2026 ويمسح أي تعديلات سابقة.
            </CardHint>
            <Button
              variant="danger"
              disabled={restore.isPending}
              onClick={() => {
                if (confirm("سيتم استبدال بياناتك الحالية بالنسخة الرسمية الأصلية. متابعة؟"))
                  restore.mutate();
              }}
            >
              {restore.isPending ? "جارٍ الاستعادة…" : "استعادة كشوف المراجعة"}
            </Button>
          </Card>

          <UserManagement />
        </>
      ) : null}

      <Card className="space-y-3">
        <CardTitle>سجل العمليات</CardTitle>
        <CardHint>آخر عمليات الاستيراد والحفظ والاستعادة المسجلة في النظام.</CardHint>
        {audit.isLoading ? (
          <p className="text-sm text-muted">جارٍ التحميل…</p>
        ) : audit.error ? (
          <p className="text-sm text-danger">تعذر تحميل السجل.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="rounded-md bg-bg-elevated p-2">
                <span className="font-medium">{a.action}</span>
                {" · "}
                <span className="text-muted">{formatIsoDate(a.created_at)}</span>
                <div className="text-muted">{a.summary}</div>
              </li>
            ))}
            {!audit.data?.length ? (
              <li className="text-muted">لا توجد عمليات مسجّلة بعد.</li>
            ) : null}
          </ul>
        )}
      </Card>
    </div>
  );
}
