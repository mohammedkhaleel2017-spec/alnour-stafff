import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Table2,
  FileSpreadsheet,
  Search,
  Printer,
  Menu,
  X,
  UserPlus,
  Users,
  ShieldCheck,
  Eye,
  LogOut,
  Clock,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { authClient, signOut } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState, useCurrentUserRole } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Emblem } from "./emblem";
import { LoginPage } from "./login-page";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { UserManagement } from "./user-management";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const BASE_NAV: NavItem[] = [
  { to: "/", label: "لوحة المعلومات", icon: LayoutDashboard },
  { to: "/staff", label: "جدول العاملين", icon: Table2 },
  { to: "/staff/new", label: "إضافة معلم", icon: UserPlus, adminOnly: true },
  { to: "/queries", label: "الاستعلامات", icon: Search },
  { to: "/reports", label: "التقارير والكشوف", icon: FileSpreadsheet },
  { to: "/print", label: "طباعة الكشف", icon: Printer },
];

function NavLinks({
  isAdmin,
  pendingCount,
  onOpenUsers,
  onNavigate,
}: {
  isAdmin: boolean;
  pendingCount: number;
  onOpenUsers: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = BASE_NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.to === "/"
            ? pathname === "/"
            : item.to === "/staff"
              ? pathname === "/staff"
              : pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
              active ? "bg-primary text-primary-fg" : "text-fg hover:bg-primary-soft",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      {isAdmin ? (
        <button
          type="button"
          onClick={() => {
            onOpenUsers();
            onNavigate?.();
          }}
          className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-fg hover:bg-primary-soft transition-colors duration-150"
        >
          <span className="flex items-center gap-3">
            <Users className="size-4 shrink-0 text-primary" />
            المستخدمين والموافقات
          </span>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs text-white">
              {pendingCount}
            </span>
          ) : null}
        </button>
      ) : null}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const roleQuery = useCurrentUserRole();

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <div className="mx-auto grid max-w-6xl gap-4">
          <p className="text-sm text-muted">جارٍ تحميل نظام شئون العاملين</p>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const isRoleLoading = roleQuery.isLoading;
  const isApproved = roleQuery.data?.isApproved ?? false;
  const isAdmin = roleQuery.data?.isAdmin ?? false;
  const pendingCount = roleQuery.data?.pendingApprovalsCount ?? 0;

  // Still fetching role — keep showing skeleton so we don't flash wrong content
  if (isRoleLoading) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <div className="mx-auto grid max-w-6xl gap-4">
          <p className="text-sm text-muted">جارٍ التحقق من الصلاحيات…</p>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // If logged-in user is not yet approved by admin:
  if (roleQuery.data && !isApproved) {
    return (
      <main className="app-watermark grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-warn-soft text-warn">
            <Clock className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">الحساب في انتظار موافقة المسؤول</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            تم استلام طلب تسجيل الدخول بنجاح. بموجب سياسة مدرسة النور، يتطلب تفعيل الحساب موافقة مدير
            المدرسة (الأدمن) أولاً.
          </p>
          <div className="mt-6 rounded-lg bg-bg-elevated p-3 text-xs text-subtle">
            البريد الحالي: <span dir="ltr">{user.primaryEmail}</span>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                signOut().then(() => window.location.assign("/login"));
              }}
              className="gap-2"
            >
              <LogOut className="size-4" />
              تسجيل الخروج والعودة لاحقاً
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="app-watermark min-h-dvh bg-bg">
      <header className="no-print border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </Button>
          <Emblem className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-ink">مجمع مدارس النور للمكفوفين</p>
              {isRoleLoading ? (
                <Skeleton className="h-5 w-24 rounded-full" />
              ) : isAdmin ? (
                <Badge tone="default" className="gap-1 text-[11px] py-0 px-2">
                  <ShieldCheck className="size-3" />
                  مدير النظام (أدمن)
                </Badge>
              ) : (
                <Badge tone="warn" className="gap-1 text-[11px] py-0 px-2">
                  <Eye className="size-3" />
                  مستعرض (قراءة فقط)
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted">مديرية التربية والتعليم بالسويس · إدارة شمال السويس</p>
          </div>
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            {isAdmin && pendingCount > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUsersModal(true)}
                className="border-danger/40 text-danger text-xs h-8"
              >
                <Users className="size-3.5 mr-1" />
                موافقات معلقة ({pendingCount})
              </Button>
            ) : null}
            <UserButton />
          </div>
        </div>
      </header>

      <div className="print-layout mx-auto grid max-w-[1400px] lg:grid-cols-[240px_1fr]">
        <aside className="no-print hidden border-l border-border p-4 lg:block">
          <p className="mb-3 px-3 text-xs font-medium tracking-wide text-subtle">وحدات النظام</p>
          <NavLinks
            isAdmin={isAdmin}
            pendingCount={pendingCount}
            onOpenUsers={() => setShowUsersModal(true)}
          />
        </aside>
        <main className="min-w-0 p-4 pb-24 lg:p-6">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[84%] max-w-xs bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">القائمة</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="size-5" />
              </Button>
            </div>
            <NavLinks
              isAdmin={isAdmin}
              pendingCount={pendingCount}
              onOpenUsers={() => setShowUsersModal(true)}
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-6 border-t border-border pt-4">
              <UserButton />
            </div>
          </div>
        </div>
      ) : null}

      {/* Admin Users & Approvals Modal */}
      {showUsersModal ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50 backdrop-blur-xs"
            aria-label="إغلاق"
            onClick={() => setShowUsersModal(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <h3 className="text-lg font-bold">إدارة حسابات المستخدمين والموافقات</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUsersModal(false)}
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </Button>
            </div>
            <UserManagement />
          </div>
        </div>
      ) : null}
    </div>
  );
}
