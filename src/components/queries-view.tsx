import { Link } from "@tanstack/react-router";
import { SAVED_QUERIES } from "@/lib/staff-filters";
import { Card, CardHint, CardTitle } from "./ui/card";

export function QueriesView() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">الاستعلامات المحفوظة</h1>
        <p className="text-sm text-muted">مجموعة استعلامات جاهزة على غرار استعلامات قاعدة أكسس.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SAVED_QUERIES.map((q) => (
          <Link key={q.id} to="/staff" search={{ query: q.id }} className="block">
            <Card className="h-full transition-colors duration-150 hover:bg-primary-soft">
              <CardTitle className="text-base">{q.title}</CardTitle>
              <CardHint className="mt-2">{q.hint}</CardHint>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
