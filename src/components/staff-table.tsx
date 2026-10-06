import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { getCurrentUserRole } from "@/lib/auth/admin-server";
import { deleteStaff, listStaff } from "@/lib/staff-server";
import { matchesQuery, searchStaff, type StaffQueryId } from "@/lib/staff-filters";
import { SCHOOLS } from "@/lib/staff-types";
import { formatIsoDate } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Skeleton } from "./ui/skeleton";

export function StaffTable({
  initialQuery,
  initialSchool,
}: {
  initialQuery?: StaffQueryId;
  initialSchool?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["staff"], queryFn: () => listStaff() });
  const roleQuery = useQuery({ queryKey: ["current-user-role"], queryFn: () => getCurrentUserRole() });
  const isAdmin = roleQuery.data?.isAdmin ?? false;

  const [term, setTerm] = useState("");
  const [school, setSchool] = useState(initialSchool ?? "");
  const [query, setQuery] = useState<StaffQueryId>(initialQuery ?? "all");

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
    if (initialSchool) setSchool(initialSchool);
  }, [initialQuery, initialSchool]);

  const remove = useMutation({
    mutationFn: (id: number) => deleteStaff({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
  });

  const rows = useMemo(() => {
    let data = list.data ?? [];
    if (school) data = data.filter((r) => r.school_code === school);
    data = data.filter((r) => matchesQuery(r, query));
    return searchStaff(data, term);
  }, [list.data, school, query, term]);

  if (list.isLoading) return <Skeleton className="h-96" />;
  if (list.error) return <p className="text-danger">تعذر تحميل الجدول. سجّل الدخول ثم أعد المحاولة.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">جدول بيانات العاملين</h1>
            {!isAdmin ? (
              <Badge tone="warn" className="text-xs">
                وضع القراءة فقط
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted">عرض شبكة بأعمدة كشوف المراجعة · {rows.length} سجل</p>
        </div>
        {isAdmin ? (
          <Button onClick={() => navigate({ to: "/staff/new" })} className="gap-1.5">
            <Plus className="size-4" />
            إضافة معلم
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] md:grid-cols-3">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="بحث بالاسم أو الكود أو الرقم القومي"
        />
        <Select value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">كل جهات العمل</option>
          {SCHOOLS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={query} onChange={(e) => setQuery(e.target.value as StaffQueryId)}>
          <option value="all">كل الاستعلامات</option>
          <option value="teachers">المعلمون</option>
          <option value="senior">كبار المعلمين</option>
          <option value="expert">المعلم الخبير</option>
          <option value="first">معلم أول</option>
          <option value="first-a">معلم أول أ</option>
          <option value="assistant">معلم مساعد</option>
          <option value="not-cadre">خارج الكادر</option>
          <option value="retirement">قرب المعاش</option>
          <option value="before-2000">تعيين قبل 2000</option>
          <option value="pedagogy">تأهيل تربوي</option>
          <option value="specialists">أخصائيون ومكتبات</option>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-card)]">
        <table className="datasheet w-full min-w-[68rem] text-right text-sm">
          <thead className="bg-bg-elevated text-xs text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">م</th>
              <th className="px-3 py-3 font-medium">كود المعلم</th>
              <th className="px-3 py-3 font-medium">الاسم / الرقم القومي</th>
              <th className="px-3 py-3 font-medium">جهة العمل</th>
              <th className="px-3 py-3 font-medium">التعيين / المادة</th>
              <th className="px-3 py-3 font-medium">الدرجة المالية</th>
              <th className="px-3 py-3 font-medium">الوظيفة على الكادر</th>
              <th className="px-3 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-primary-soft/50">
                <td className="px-3 py-2 tabular-nums text-subtle">{i + 1}</td>
                <td className="px-3 py-2 font-medium tabular-nums">{row.teacher_code}</td>
                <td className="px-3 py-2">
                  <Link to="/staff/$id" params={{ id: String(row.id) }} className="font-medium text-ink hover:underline">
                    {row.full_name}
                  </Link>
                  <div className="text-xs tabular-nums text-subtle">{row.national_id}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.stage}</div>
                  <div className="text-xs text-subtle">{row.school_name}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{formatIsoDate(row.appointment_date)}</div>
                  <div className="text-xs text-subtle">{row.subject || "—"}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.financial_grade}</div>
                  <div className="text-xs text-subtle">{formatIsoDate(row.financial_grade_date)}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={row.under_cadre ? "default" : "warn"}>{row.cadre_job}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/staff/$id" params={{ id: String(row.id) }} className="text-primary hover:underline">
                      {isAdmin ? "تعديل" : "عرض التفاصيل"}
                    </Link>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="text-danger hover:underline"
                        onClick={() => {
                          if (confirm(`حذف ${row.full_name}؟`)) remove.mutate(row.id);
                        }}
                      >
                        حذف
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted">
                  لا توجد سجلات مطابقة.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
