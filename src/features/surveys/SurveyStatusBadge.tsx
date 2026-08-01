import { cn } from "../../lib/cn";
import type { SurveyStatus } from "./surveys.types";

const toneClassMap: Record<SurveyStatus, string> = {
  archived: "bg-app-surface-muted text-app-text-soft",
  closed: "bg-app-surface-muted text-app-text-soft",
  draft: "bg-app-warning-soft text-app-warning",
  published: "bg-app-success-soft text-app-success"
};

export const SurveyStatusBadge = ({ status }: { status: SurveyStatus }) => (
  <span className={cn("rounded-full px-2.5 py-1.5 text-[0.82rem] font-bold capitalize", toneClassMap[status])}>
    {status.replace("_", " ")}
  </span>
);
