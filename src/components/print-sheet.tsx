import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, HelpCircle } from "lucide-react";
import { listStaff, getWorkspace } from "@/lib/staff-server";
import { SCHOOLS } from "@/lib/staff-types";
import { formatIsoDate } from "@/lib/utils";
import { Button } from "./ui/button";
import { Emblem } from "./emblem";

export function PrintSheet({ school: initialSchool }: { school?: string }) {
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchool ?? "");
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff() });
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: () => getWorkspace() });

  const rows = (staff.data ?? []).filter((r) =>
    selectedSchool ? r.school_code === selectedSchool : true,
  );

  const currentSchoolObj = SCHOOLS.find((s) => s.code === selectedSchool);
  const title = selectedSchool
    ? currentSchoolObj?.name ?? rows[0]?.school_name ?? "جهة العمل"
    : "مجمع مدارس النور للمكفوفين (جميع المراحل)";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="no-print space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">طباعة كشف مراجعة العاملين</h1>
            <p className="text-sm text-muted">
              عرض كشف A4 أفقي رسمي مطابق لدفاتر الإحصاء وشئون العاملين.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary text-white hover:bg-primary/90"
            >
              <Printer className="size-4" />
              طباعة / حفظ كـ PDF
            </Button>
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted">تحديد المرحلة:</span>
          <Button
            size="sm"
            variant={selectedSchool === "" ? "default" : "outline"}
            onClick={() => setSelectedSchool("")}
            className="text-xs h-8"
          >
            المجمع بالكامل ({staff.data?.length ?? 0})
          </Button>
          {SCHOOLS.map((s) => {
            const count = (staff.data ?? []).filter((r) => r.school_code === s.code).length;
            return (
              <Button
                key={s.code}
                size="sm"
                variant={selectedSchool === s.code ? "default" : "outline"}
                onClick={() => setSelectedSchool(s.code)}
                className="text-xs h-8"
              >
                {s.stage} ({count})
              </Button>
            );
          })}
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2 rounded-lg bg-bg-elevated p-2.5 text-xs text-subtle">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <strong>تعليمات الطباعة:</strong> اضغط «طباعة / حفظ كـ PDF»، ثم من نافذة الطباعة اختر الوجهة{" "}
            <strong>«Save as PDF»</strong> واضبط الاتجاه على <strong>«Landscape» (أفقي)</strong> للحصول على كشف كامل بجودة عالية.
          </p>
        </div>
      </div>

      {/* Printable Sheet */}
      <article
        id="print-sheet-content"
        dir="rtl"
        className="print-sheet rounded-xl bg-surface p-6 shadow-[var(--shadow-card)]"
      >
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <p className="text-xs font-semibold text-primary">
              جمهورية مصر العربية · وزارة التربية والتعليم والتعليم الفني
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">كشوف مراجعة بيانات العاملين</h2>
            <p className="mt-1 text-xs text-muted">
              المديرية: {workspace.data?.directorate ?? "السويس"} · الإدارة:{" "}
              {workspace.data?.administration ?? "شمال السويس"}
            </p>
            <p className="text-xs font-medium text-ink">جهة العمل: {title}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Emblem className="size-12" />
            <span className="text-[10px] text-muted">إجمالي الكشف: {rows.length}</span>
          </div>
        </header>

        <table className="datasheet w-full text-right text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-center">م</th>
              <th className="px-2 py-1.5 text-center">كود المعلم</th>
              <th className="px-2 py-1.5">الاسم</th>
              <th className="px-2 py-1.5">الرقم القومي</th>
              <th className="px-2 py-1.5">تاريخ التعيين</th>
              <th className="px-2 py-1.5">المادة</th>
              <th className="px-2 py-1.5">الدرجة المالية</th>
              <th className="px-2 py-1.5">تاريخ الدرجة</th>
              <th className="px-2 py-1.5">الوظيفة الحالية</th>
              <th className="px-2 py-1.5">المؤهل</th>
              <th className="px-2 py-1.5">الوظيفة على الكادر</th>
              <th className="px-2 py-1.5">تاريخ الكادر</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td className="px-2 py-1 text-center tabular-nums">{i + 1}</td>
                <td className="px-2 py-1 text-center font-medium tabular-nums">{row.teacher_code}</td>
                <td className="px-2 py-1 font-semibold">{row.full_name}</td>
                <td className="px-2 py-1 tabular-nums">{row.national_id}</td>
                <td className="px-2 py-1 tabular-nums">{formatIsoDate(row.appointment_date)}</td>
                <td className="px-2 py-1">{row.subject || "—"}</td>
                <td className="px-2 py-1">{row.financial_grade}</td>
                <td className="px-2 py-1 tabular-nums">{formatIsoDate(row.financial_grade_date)}</td>
                <td className="px-2 py-1">{row.current_job}</td>
                <td className="px-2 py-1">
                  {row.qualification_type}
                  {row.qualification ? ` - ${row.qualification}` : ""}
                </td>
                <td className="px-2 py-1 font-medium">{row.cadre_job}</td>
                <td className="px-2 py-1 tabular-nums">{formatIsoDate(row.cadre_date)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-muted">
                  لا توجد بيانات مسجلة في هذا الكشف.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <footer className="mt-8 grid gap-4 border-t border-border pt-4 text-[11px] text-muted sm:grid-cols-3">
          <div className="text-center sm:text-right">
            <p className="font-semibold text-ink">مراجعة الملفات</p>
            <p className="mt-1 text-subtle">تمت المراجعة من واقع الملفات الرسمية</p>
            <p className="mt-6 text-xs font-medium text-ink">مدير شئون العاملين بالإدارة</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-ink">قسم الإحصاء</p>
            <p className="mt-1 text-subtle">تمت مطابقة وتحديث بيانات الحاسب الآلي</p>
            <p className="mt-6 text-xs font-medium text-ink">مسئول الإحصاء بالإدارة</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-ink">إدارة المدرسة</p>
            <p className="mt-1 text-subtle">تشهد الإدارة بأن البيانات تخص العاملين بالمجمع</p>
            <p className="mt-6 text-xs font-medium text-ink">مدير المدرسة</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
