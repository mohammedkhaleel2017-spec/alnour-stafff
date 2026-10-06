import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, ShieldAlert, Trash2, UserCheck, UserX } from "lucide-react";
import {
  approveUser,
  deleteUserAccount,
  listUsers,
  rejectUser,
  setUserRole,
  type UserApprovalItem,
} from "@/lib/auth/admin-server";
import { formatIsoDate } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardHint, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function UserManagement() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [msg, setMsg] = useState("");
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => listUsers() });

  const approve = useMutation({
    mutationFn: (userId: string) => approveUser({ data: { userId } }),
    onSuccess: async () => {
      setMsg("تمت الموافقة على الحساب بنجاح.");
      await qc.invalidateQueries();
    },
  });

  const reject = useMutation({
    mutationFn: (userId: string) => rejectUser({ data: { userId } }),
    onSuccess: async () => {
      setMsg("تم إلغاء تفعيل الحساب.");
      await qc.invalidateQueries();
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "viewer" }) =>
      setUserRole({ data: { userId, role } }),
    onSuccess: async () => {
      setMsg("تم تحديث نوع الحساب بنجاح.");
      await qc.invalidateQueries();
    },
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => deleteUserAccount({ data: { userId } }),
    onSuccess: async () => {
      setMsg("تم حذف الحساب نهائياً.");
      await qc.invalidateQueries();
    },
  });

  const allList = users.data ?? [];
  const pendingCount = allList.filter((u) => !u.is_approved).length;
  const filtered = allList.filter((u) => {
    if (filter === "pending") return !u.is_approved;
    if (filter === "approved") return u.is_approved;
    return true;
  });

  if (users.isLoading) return <Skeleton className="h-64" />;
  if (users.error) {
    return (
      <Card className="border-danger/30 bg-danger-soft/20 text-danger">
        <p className="font-semibold">تعذر تحميل قائمة المستخدمين.</p>
        <p className="text-xs">تأكد من تسجيل الدخول بصلاحيات الأدمن.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">إدارة المستخدمين والموافقات</h2>
          <p className="text-sm text-muted">
            التحكم في من يحق له تسجيل الدخول ومنح صلاحيات الأدمن أو القراءة فقط.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            الكل ({allList.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className="relative"
          >
            في انتظار الموافقة
            {pendingCount > 0 ? (
              <span className="mr-1.5 rounded-full bg-danger px-1.5 py-0.5 text-xs text-white">
                {pendingCount}
              </span>
            ) : null}
          </Button>
          <Button
            size="sm"
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
          >
            المعتمدون ({allList.length - pendingCount})
          </Button>
        </div>
      </div>

      {msg ? (
        <div className="flex items-center justify-between rounded-lg bg-success-soft p-3 text-sm text-success">
          <span>{msg}</span>
          <button type="button" onClick={() => setMsg("")} className="font-bold">
            ×
          </button>
        </div>
      ) : null}

      <Card className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-elevated text-muted">
                <th className="p-2.5">المستخدم</th>
                <th className="p-2.5">البريد الإلكتروني</th>
                <th className="p-2.5">تاريخ التسجيل</th>
                <th className="p-2.5">نوع الحساب</th>
                <th className="p-2.5">حالة الموافقة</th>
                <th className="p-2.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u: UserApprovalItem) => (
                <tr key={u.id} className="hover:bg-primary-soft/30">
                  <td className="p-2.5 font-medium">{u.name}</td>
                  <td className="p-2.5 tabular-nums text-muted" dir="ltr">
                    {u.email}
                  </td>
                  <td className="p-2.5 text-muted">{formatIsoDate(u.created_at)}</td>
                  <td className="p-2.5">
                    {u.role === "admin" ? (
                      <Badge tone="default" className="gap-1">
                        <ShieldCheck className="size-3" />
                        مدير (أدمن)
                      </Badge>
                    ) : (
                      <Badge tone="warn" className="gap-1">
                        قارئ فقط
                      </Badge>
                    )}
                  </td>
                  <td className="p-2.5">
                    {u.is_approved ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="size-3.5" />
                        معتمد
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-danger">
                        <Clock className="size-3.5" />
                        في انتظار الموافقة
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {!u.is_approved ? (
                        <Button
                          size="sm"
                          className="bg-success text-white hover:bg-success/90 h-8 px-2 text-xs"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(u.id)}
                        >
                          <UserCheck className="mr-1 size-3.5" />
                          موافقة وتفعيل
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs text-warn"
                          disabled={reject.isPending}
                          onClick={() => {
                            if (confirm(`إلغاء تفعيل حساب ${u.name}؟ لن يتمكن من تسجيل الدخول.`))
                              reject.mutate(u.id);
                          }}
                        >
                          <UserX className="mr-1 size-3.5" />
                          إلغاء التفعيل
                        </Button>
                      )}

                      {u.role === "admin" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-muted"
                          disabled={changeRole.isPending}
                          onClick={() => changeRole.mutate({ userId: u.id, role: "viewer" })}
                        >
                          تحويل لقارئ
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-primary"
                          disabled={changeRole.isPending}
                          onClick={() => changeRole.mutate({ userId: u.id, role: "admin" })}
                        >
                          ترقية لأدمن
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-1.5 text-danger hover:bg-danger-soft"
                        disabled={removeUser.isPending}
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف حساب ${u.name} نهائياً؟`))
                            removeUser.mutate(u.id);
                        }}
                        title="حذف الحساب"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    لا يوجد مستخدمون في هذا القسم.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
