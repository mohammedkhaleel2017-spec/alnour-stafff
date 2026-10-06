import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { getCurrentUserRole } from "@/lib/auth/admin-server";
import { parseEgyptianNid } from "@/lib/national-id";
import { getStaff, inputFromRow, saveStaff } from "@/lib/staff-server";
import { CATEGORIES, EDUCATION_GROUP, QUAL_TYPES, SCHOOLS, type StaffInput } from "@/lib/staff-types";
import { formatIsoDate, yearsBetween } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardHint, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

const emptyForm = (): StaffInput => ({
  schoolCode: "primary",
  teacherCode: "",
  fullName: "",
  nationalId: "",
  appointmentDate: "",
  subject: "",
  financialGrade: "",
  financialGradeDate: "",
  jobGroup: EDUCATION_GROUP,
  currentJob: "",
  qualificationType: "عليا",
  qualification: "",
  cadreJob: "",
  cadreDate: "",
  category: "معلم",
  underCadre: true,
  dataErrors: "",
  notes: "",
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function StaffForm({ id }: { id?: number }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaff({ data: { id: id! } }),
    enabled: id != null,
  });
  const roleQuery = useQuery({ queryKey: ["current-user-role"], queryFn: () => getCurrentUserRole() });
  const isAdmin = roleQuery.data?.isAdmin ?? false;

  const [form, setForm] = useState<StaffInput>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing.data) setForm(inputFromRow(existing.data));
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => saveStaff({ data: form }),
    onSuccess: async (res) => {
      await qc.invalidateQueries();
      await navigate({ to: "/staff/$id", params: { id: String(res.id) } });
    },
    onError: (err: Error) => setError(err.message),
  });

  const nid = parseEgyptianNid(form.nationalId);
  const service = yearsBetween(form.appointmentDate);

  function set<K extends keyof StaffInput>(key: K, value: StaffInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isAdmin) {
          setError("غير مصرح: الحفظ والتعديل متاح فقط لمدير النظام (الأدمن).");
          return;
        }
        setError("");
        save.mutate();
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{id ? "بيانات المعلم" : "إضافة معلم جديد"}</h1>
            {!isAdmin ? (
              <Badge tone="warn" className="text-xs">
                وضع القراءة فقط
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted">الحقول مطابقة لكشوف مراجعة بيانات العاملين.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate({ to: "/staff" })}>
            العودة للجدول
          </Button>
          {isAdmin ? (
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "جارٍ الحفظ…" : "حفظ السجل"}
            </Button>
          ) : null}
        </div>
      </div>

      {!isAdmin ? (
        <div className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          <ShieldAlert className="size-5 shrink-0" />
          <p>
            أنت في <strong>وضع القراءة فقط</strong>. لا تملك صلاحية لتعديل أو إضافة بيانات.
            الصلاحية مقتصرة على مدير النظام (الأدمن).
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="space-y-4">
          <CardTitle>البيانات الأساسية</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="جهة العمل">
              <Select
                value={form.schoolCode}
                onChange={(e) => set("schoolCode", e.target.value)}
                disabled={!isAdmin}
              >
                {SCHOOLS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="كود المعلم">
              <Input
                value={form.teacherCode}
                onChange={(e) => set("teacherCode", e.target.value)}
                required
                disabled={!isAdmin}
              />
            </Field>
            <Field label="الاسم الرباعي">
              <Input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                required
                disabled={!isAdmin}
              />
            </Field>
            <Field label="الرقم القومي">
              <Input
                value={form.nationalId}
                onChange={(e) => set("nationalId", e.target.value)}
                inputMode="numeric"
                maxLength={14}
                disabled={!isAdmin}
              />
            </Field>
            <Field label="تاريخ التعيين">
              <Input
                type="date"
                value={form.appointmentDate}
                onChange={(e) => set("appointmentDate", e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
            <Field label="مادة التدريس">
              <Input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
            <Field label="التصنيف">
              <Select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={!isAdmin}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="نوع المؤهل">
              <Select
                value={form.qualificationType}
                onChange={(e) => set("qualificationType", e.target.value)}
                disabled={!isAdmin}
              >
                {QUAL_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="المؤهل">
                <Input
                  value={form.qualification}
                  onChange={(e) => set("qualification", e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <CardTitle>مستنتج من الرقم القومي</CardTitle>
          <CardHint>يُحسب تلقائياً دون تعديل الملف الأصلي.</CardHint>
          {nid ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">تاريخ الميلاد</dt>
                <dd>{formatIsoDate(nid.birthDate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">السن</dt>
                <dd className="tabular-nums">{nid.age} سنة</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">النوع</dt>
                <dd>{nid.gender}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">محافظة الميلاد</dt>
                <dd>{nid.governorate}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">سنوات حتى المعاش</dt>
                <dd>
                  <Badge tone={nid.yearsToRetirement <= 5 ? "warn" : "default"}>
                    {nid.yearsToRetirement} سنة
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">مدة الخدمة</dt>
                <dd className="tabular-nums">{service ?? "—"} سنة</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">أدخل رقماً قومياً من 14 خانة لاستخراج البيانات.</p>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <CardTitle>الدرجة المالية والكادر</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="الدرجة المالية">
            <Input
              value={form.financialGrade}
              onChange={(e) => set("financialGrade", e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="تاريخ الدرجة">
            <Input
              type="date"
              value={form.financialGradeDate}
              onChange={(e) => set("financialGradeDate", e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="الوظيفة الحالية">
            <Input
              value={form.currentJob}
              onChange={(e) => set("currentJob", e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="المجموعة النوعية">
              <Input
                value={form.jobGroup}
                onChange={(e) => set("jobGroup", e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
          </div>
          <Field label="الوظيفة على الكادر">
            <Input
              value={form.cadreJob}
              onChange={(e) => set("cadreJob", e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="تاريخ الكادر">
            <Input
              type="date"
              value={form.cadreDate}
              onChange={(e) => set("cadreDate", e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.underCadre}
              onChange={(e) => set("underCadre", e.target.checked)}
              disabled={!isAdmin}
            />
            مخاطب بقانون كادر المعلم
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="أخطاء البيانات">
              <Input
                value={form.dataErrors}
                onChange={(e) => set("dataErrors", e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="ملاحظات شئون العاملين">
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
          </div>
        </div>
      </Card>
    </form>
  );
}
