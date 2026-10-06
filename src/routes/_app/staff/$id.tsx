import { createFileRoute } from "@tanstack/react-router";
import { StaffForm } from "@/components/staff-form";

export const Route = createFileRoute("/_app/staff/$id")({
  component: StaffDetailPage,
});

function StaffDetailPage() {
  const { id } = Route.useParams();
  return <StaffForm id={Number(id)} />;
}
