import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download, HelpCircle, FileText } from "lucide-react";
import { listStaff, getWorkspace } from "@/lib/staff-server";
import { SCHOOLS } from "@/lib/staff-types";
import { formatIsoDate } from "@/lib/utils";
import { Button } from "./ui/button";
import { Emblem } from "./emblem";

export function PrintSheet({ school: initialSchool }: { school?: string }) {
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchool ?? "");
  const [pdfLoading, setPdfLoading] = useState(false);
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff() });
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: () => getWorkspace() });

  const rows = (staff.data ?? []).filter((r) =>
    selectedSchool ? r.school_code === selectedSchool : true,
  );

  const currentSchoolObj = SCHOOLS.find((s) => s.code === selectedSchool);
  const title = selectedSchool
    ? currentSchoolObj?.name ?? rows[0]?.school_name ?? "جهة العمل"
    : "مجمع مدارس النور للمكفوفين (جميع المراحل)";

  const downloadPdf = async () => {
    if (pdfLoading) return;
    const element = document.getElementById("print-sheet-content");
    if (!element) return;

    setPdfLoading(true);
    try {
      let html2pdf = (window as unknown as { html2pdf?: () => any }).html2pdf;
      if (!html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout loading html2pdf"));
          }, 6000);

          const existing = document.querySelector<HTMLScriptElement>("script[src*=\"html2pdf.js\"]");
          if (existing) {
            existing.addEventListener("load", () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
            existing.addEventListener("error", () => {
              clearTimeout(timeout);
              reject(new Error("PDF library failed to load"));
            }, { once: true });
            return;
          }

          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.async = true;
          script.dataset.pdfExport = "html2pdf";
          script.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("PDF library failed to load"));
          };
          document.head.appendChild(script);
        });
        html2pdf = (window as unknown as { html2pdf?: () => any }).html2pdf;
      }

      if (!html2pdf) throw new Error("PDF library is not available");
      if (document.fonts?.ready) await document.fonts.ready;

      const filename = `كشف-بيانات-العاملين-${selectedSchool || "مجمع-مدارس-النور"}.pdf`;
      element.classList.add("pdf-exporting");
      try {
        await html2pdf()
          .set({
            margin: [6, 6, 6, 6],
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: Math.min(2, window.devicePixelRatio || 1.5),
              useCORS: true,
              backgroundColor: "#ffffff",
              logging: false,
              scrollX: 0,
              scrollY: 0,
            },
            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "landscape",
              compress: true,
            },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] },
          })
          .from(element)
          .save();
      } finally {
        element.classList.remove("pdf-exporting");
      }
    } catch (error) {
      console.warn("Direct html2pdf export fell back to browser print:", error);
      // Fallback gracefully to browser print dialog (Save as PDF)
      window.print();
    } finally {
      setPdfLoading(false);
    }
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
              onClick={() => window.print()}
              className="gap-2 bg-primary text-white hover:bg-primary/90"
            >
              <Printer className="size-4" />
              طباعة / حفظ كـ PDF (عالي الجودة A4)
            </Button>
            <Button
              variant="outline"
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="gap-2"
            >
              <Download className="size-4" />
              {pdfLoading ? "جارٍ تجهيز PDF…" : "تحميل ملف PDF مباشر"}
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

        {/* Tip for best PDF output */}
        <div className="flex items-start gap-2 rounded-lg bg-bg-elevated p-2.5 text-xs text-subtle">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <strong>نصيحة لأفضل نتيجة PDF:</strong> اضغط على «طباعة / حفظ كـ PDF»، ثم اختر الوجهة «Save as PDF» (حفظ بتنسيق PDF) من نافذة المتصفح للحصول على كشف فيكتور نقي يدعم تقسيم الصفحات وتكرار رأس الجدول بدقة 100%.
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

        <div className="overflow-x-auto">
          <table className="datasheet w-full min-w-[56rem] text-right text-xs">
            <thead className="bg-bg-elevated">
              <tr>
                <th className="px-2 py-1.5 text-center">م</th>
                <th className="px-2 py-1.5 text-center">كود المعلم</th>
                <th className="px-2 py-1.5">الاسم / الرقم القومي</th>
                <th className="px-2 py-1.5">التعيين / المادة</th>
                <th className="px-2 py-1.5">الدرجة المالية</th>
                <th className="px-2 py-1.5">الوظيفة الحالية</th>
                <th className="px-2 py-1.5">المؤهل</th>
                <th className="px-2 py-1.5">الوظيفة على الكادر</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="px-2 py-1.5 text-center tabular-nums">{i + 1}</td>
                  <td className="px-2 py-1.5 text-center font-medium tabular-nums">{row.teacher_code}</td>
                  <td className="px-2 py-1.5">
                    <div className="font-semibold text-ink">{row.full_name}</div>
                    <div className="tabular-nums text-subtle text-[11px]">{row.national_id}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div>{formatIsoDate(row.appointment_date)}</div>
                    <div className="text-subtle text-[11px]">{row.subject || "—"}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div>{row.financial_grade}</div>
                    <div className="text-subtle text-[11px]">{formatIsoDate(row.financial_grade_date)}</div>
                  </td>
                  <td className="px-2 py-1.5">{row.current_job}</td>
                  <td className="px-2 py-1.5">
                    <div>{row.qualification_type}</div>
                    <div className="text-subtle text-[11px]">{row.qualification}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{row.cadre_job}</div>
                    <div className="text-subtle text-[11px]">{formatIsoDate(row.cadre_date)}</div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    لا توجد بيانات مسجلة في هذا الكشف.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="mt-8 grid gap-4 border-t border-border pt-4 text-[11px] text-muted sm:grid-cols-3">
          <div className="text-center sm:text-right">
            <p className="font-semibold text-ink">مراجعة الملفات</p>
            <p className="mt-1 text-subtle">تمت المراجعة من واقع الملفات الرسمية</p>
            <p className="mt-4 text-xs font-medium text-ink">مدير شئون العاملين بالإدارة</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-ink">قسم الإحصاء</p>
            <p className="mt-1 text-subtle">تمت مطابقة وتحديث بيانات الحاسب الآلي</p>
            <p className="mt-4 text-xs font-medium text-ink">مسئول الإحصاء بالإدارة</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-ink">إدارة المدرسة</p>
            <p className="mt-1 text-subtle">تشهد الإدارة بأن البيانات تخص العاملين بالمجمع</p>
            <p className="mt-4 text-xs font-medium text-ink">مدير المدرسة</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
