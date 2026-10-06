import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboard, listAudit } from "@/lib/staff-server";
import { Card, CardHint, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function DashboardView() {
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });

  if (dash.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (dash.error) {
    return <p className="text-danger">تعذر تحميل اللوحة. أعد تسجيل الدخول ثم حاول مرة أخرى.</p>;
  }
  const d = dash.data;
  if (!d) return null;

  const kpis = [
    { label: "إجمالي العاملين", value: d.total },
    { label: "معلمون", value: d.teachers },
    { label: "على الكادر", value: d.underCadre },
    { label: "خارج الكادر", value: d.notCadre },
    { label: "متوسط الأقدمية", value: `${d.avgServiceYears} سنة` },
    { label: "قرب المعاش", value: d.nearRetirement },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">لوحة معلومات شئون العاملين</h1>
        <p className="mt-1 text-sm text-muted">
          بيانات مستخرجة من كشوف المراجعة الرسمية لحضانة النور ومدارس الابتدائي والإعدادي والثانوي.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>التوزيع حسب المرحلة</CardTitle>
          <CardHint className="mt-1">أربع جهات عمل داخل المجمع</CardHint>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byStage} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>المؤهل العلمي</CardTitle>
          <CardHint className="mt-1">عليا · دراسات عليا · فوق المتوسطة · متوسطة</CardHint>
          <ul className="mt-4 space-y-3">
            {d.byQualification.map((item) => (
              <li key={item.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="tabular-nums text-muted">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.total ? (item.value / d.total) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardTitle>الوظائف على الكادر</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-right text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 font-medium">الوظيفة</th>
                  <th className="pb-2 font-medium">العدد</th>
                </tr>
              </thead>
              <tbody>
                {d.byRank.slice(0, 8).map((row) => (
                  <tr key={row.name} className="border-t border-border">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>آخر العمليات</CardTitle>
            <Link to="/reports" className="text-sm text-primary hover:underline">
              التقارير
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {(audit.data ?? []).slice(0, 8).map((item) => (
              <li key={item.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <p>{item.summary}</p>
                <p className="text-xs text-subtle">{item.created_at.slice(0, 16).replace("T", " ")}</p>
              </li>
            ))}
            {audit.data?.length === 0 ? <p className="text-muted">لا توجد عمليات بعد.</p> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
