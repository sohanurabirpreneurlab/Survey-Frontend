import { cn } from "../../lib/cn";
import type { SurveyStatus } from "./surveys.types";

const toneClassMap: Record<SurveyStatus, string> = {
  archived: "survey-badge-archived",
  closed: "survey-badge-closed",
  draft: "survey-badge-draft",
  published: "survey-badge-published"
};

export const SurveyStatusBadge = ({ status }: { status: SurveyStatus }) => (
  <span className={cn("survey-badge", toneClassMap[status])}>{status.replace("_", " ")}</span>
);
