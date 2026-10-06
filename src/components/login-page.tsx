import { useState, type FormEvent } from "react";
import { Shield, Clock, CheckCircle2 } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { signInLocal, signUpLocal } from "@/lib/local-auth";
import { toAuthEmail } from "@/lib/utils";
import { Emblem } from "./emblem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const BEARER_KEY = "grok-auth.bearer-token";

function storeSessionToken(token: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
    window.localStorage.setItem(BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

export function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const email = toAuthEmail(username);
    try {
      const result =
        mode === "up"
          ? await signUpLocal({ data: { email, password, name: name || username } })
          : await signInLocal({ data: { email, password } });
      if (!result.ok) {
        if ("pendingApproval" in result && result.pendingApproval) {
          setNotice(result.message);
        } else {
          setError(result.message);
        }
        return;
      }
      storeSessionToken(result.token);
      await authClient.getSession();
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "تعذر إتمام العملية. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-watermark grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Emblem className="mb-3 size-14" />
          <p className="text-xs font-medium text-primary">وزارة التربية والتعليم · محافظة السويس</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">نظام شئون العاملين</h1>
          <p className="mt-1 text-sm text-muted">مجمع مدارس النور للمكفوفين</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-bg-elevated p-1">
          <button
            type="button"
            className={`min-h-11 rounded-md text-sm font-medium ${mode === "in" ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted"}`}
            onClick={() => {
              setMode("in");
              setError("");
              setNotice("");
            }}
          >
            دخول
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-md text-sm font-medium ${mode === "up" ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted"}`}
            onClick={() => {
              setMode("up");
              setError("");
              setNotice("");
            }}
          >
            حساب جديد
          </button>
        </div>

        {notice ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-relaxed">{notice}</p>
          </div>
        ) : null}

        {authEnabled ? (
          <form className="space-y-3" onSubmit={onSubmit}>
            {mode === "up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="الاسم ثلاثي أو رباعي"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="user">اسم المستخدم أو البريد الإلكتروني</Label>
              <Input
                id="user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                inputMode="email"
                required
                placeholder="مثال: admin أو ahmed"
                dir="ltr"
              />
              <p className="text-xs text-subtle">
                يمكنك كتابة اسم المستخدم فقط وسيكمله النظام تلقائياً.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass">كلمة المرور</Label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                required
                minLength={8}
                dir="ltr"
              />
              <p className="text-xs text-subtle">8 أحرف على الأقل</p>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جارٍ التنفيذ…" : mode === "up" ? "إنشاء الحساب (يتطلب موافقة الأدمن)" : "تسجيل الدخول"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">تسجيل الدخول غير مفعّل حالياً.</p>
        )}

        {authEnabled ? (
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs text-subtle">أو المتابعة عبر</p>
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="outline"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                متابعة عبر {p.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-border bg-bg-elevated p-3 text-xs leading-relaxed text-subtle">
          <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
            <Shield className="size-3.5" />
            <span>نظام الصلاحيات والموافقة:</span>
          </div>
          <p>
            • الحسابات الجديدة تُنشأ في وضع <strong>الانتظار</strong> حتى يعتمدها مدير المدرسة (الأدمن).
          </p>
          <p className="mt-1">
            • المستخدم العادي المعتمد يحصل على <strong>صلاحية استعراض فقط</strong> بدون تعديل على البيانات.
          </p>
          <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted">
            حساب الأدمن الافتراضي: <code className="bg-surface px-1 py-0.5 rounded text-ink">admin</code> / كلمة المرور: <code className="bg-surface px-1 py-0.5 rounded text-ink">Alnour@123</code>
          </div>
        </div>
      </div>
    </main>
  );
}
