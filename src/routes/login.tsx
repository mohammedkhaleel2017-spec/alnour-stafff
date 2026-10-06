import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoginPage } from "@/components/login-page";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Skeleton className="h-80 w-full max-w-md" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;
  return <LoginPage />;
}
