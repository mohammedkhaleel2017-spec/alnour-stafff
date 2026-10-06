import { createFileRoute } from "@tanstack/react-router";
import { StaffTable } from "@/components/staff-table";
import type { StaffQueryId } from "@/lib/staff-filters";

type StaffSearch = {
  query?: StaffQueryId;
  school?: string;
};

export const Route = createFileRoute("/_app/staff/")({
  validateSearch: (search: Record<string, unknown>): StaffSearch => ({
    query: typeof search.query === "string" ? (search.query as StaffQueryId) : undefined,
    school: typeof search.school === "string" ? search.school : undefined,
  }),
  component: StaffPage,
});

function StaffPage() {
  const { query, school } = Route.useSearch();
  return <StaffTable initialQuery={query} initialSchool={school} />;
}
