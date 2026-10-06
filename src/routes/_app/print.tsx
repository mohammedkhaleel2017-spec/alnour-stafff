import { createFileRoute, useSearch } from "@tanstack/react-router";
import { PrintSheet } from "@/components/print-sheet";

export const Route = createFileRoute("/_app/print")({
  component: PrintPage,
});

function PrintPage() {
  const search = useSearch({ strict: false }) as { school?: string };
  return <PrintSheet school={search.school} />;
}
