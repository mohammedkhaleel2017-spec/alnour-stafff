import { createFileRoute } from "@tanstack/react-router";
import { QueriesView } from "@/components/queries-view";

export const Route = createFileRoute("/_app/queries")({ component: QueriesView });
