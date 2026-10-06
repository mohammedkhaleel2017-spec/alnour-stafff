import { createFileRoute } from "@tanstack/react-router";
import { StaffForm } from "@/components/staff-form";

export const Route = createFileRoute("/_app/staff/new")({
  component: () => <StaffForm />,
});
