import { ROUTE_STATUS_LABEL } from "@/features/routes/api";
import type { RouteStatus } from "@/types/domain";

const TONE: Record<RouteStatus, string> = {
  draft: "bg-raised text-soft",
  active: "bg-warn-solid text-white",
  finished: "bg-ok-solid text-white",
};

export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  return (
    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${TONE[status]}`}>
      {ROUTE_STATUS_LABEL[status]}
    </span>
  );
}
