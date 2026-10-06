import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toAuthEmail(username: string): string {
  const value = username.trim();
  if (!value) return "";
  if (value.includes("@")) return value.toLowerCase();
  return `${value.toLowerCase()}@alnour.suez.edu.eg`;
}

export function formatIsoDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function yearsBetween(fromIso: string | null | undefined, to = new Date()): number | null {
  if (!fromIso) return null;
  const date = new Date(`${fromIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  let years = to.getFullYear() - date.getFullYear();
  const monthDelta = to.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && to.getDate() < date.getDate())) years -= 1;
  return years;
}

export function downloadTextFile(filename: string, contents: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadAuditCsv(items: Array<{ id: number; action: string; summary: string; created_at: string; staff_id: number | null }>) {
  const headers = ["معرف العملية", "نوع الإجراء", "التاريخ والوقت", "التفاصيل", "رقم المعلم"];
  const rows = items.map((a) =>
    [
      a.id,
      a.action === "create" ? "إضافة" : a.action === "update" ? "تعديل" : a.action === "delete" ? "حذف" : a.action,
      formatIsoDate(a.created_at),
      a.summary,
      a.staff_id ?? "—",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows].join("\n");
  downloadTextFile(`سجل-تعديلات-وحذف-العاملين-${new Date().toISOString().slice(0, 10)}.csv`, csvContent, "text/csv;charset=utf-8");
}

