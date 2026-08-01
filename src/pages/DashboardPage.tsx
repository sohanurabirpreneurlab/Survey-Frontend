import { useQuery } from "@tanstack/react-query";
import { Building2, ChartNoAxesColumn, ListChecks, ShieldCheck, Sparkles } from "lucide-react";

import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { listSurveysRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { pageTw } from "../lib/page-tailwind";

export const DashboardPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const activeOrganizationId = auth.organizations[0]?.organizationId;
  const surveysQuery = useQuery({
    enabled: Boolean(token && activeOrganizationId),
    queryFn: () => listSurveysRequest(token, { limit: 12, organizationId: activeOrganizationId, page: 1 }),
    queryKey: surveyKeys.list({ organizationId: activeOrganizationId, page: 1 })
  });
  const surveys = surveysQuery.data?.items ?? [];
  const draftCount = surveys.filter((survey) => Boolean(survey.currentDraftVersionId)).length;
  const publishedCount = surveys.filter((survey) => survey.status === "published").length;
  const responseCount = surveys.reduce((total, survey) => total + survey.submittedResponseCount, 0);
  const previewOnlyCount = surveys.filter((survey) => survey.access.isCrossOrganizationPreview).length;

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <p className={pageTw.eyebrow}>{auth.isPlatformAdmin ? "Platform-ready workspace" : "Approved workspace"}</p>
          <h1 className={pageTw.heroTitle}>Hello, {auth.user?.fullName?.split(" ")[0] ?? "there"}.</h1>
          <p className={pageTw.muted}>
            Keep an eye on what is still in draft, what is already live, and where your next survey action should happen.
          </p>
        </div>
      </section>

      <section className={pageTw.gridThree}>
        {[
          {
            description: "Surveys that still have an active draft and need builder work.",
            icon: ListChecks,
            title: "Draft surveys",
            value: draftCount
          },
          {
            description: "Published surveys currently ready for respondents and sharing.",
            icon: ChartNoAxesColumn,
            title: "Live surveys",
            value: publishedCount
          },
          {
            description: "Submitted responses across the current workspace scope.",
            icon: Sparkles,
            title: "Responses received",
            value: responseCount
          }
        ].map((item) => (
          <Card key={item.title} className={pageTw.metricCard}>
            <div className={pageTw.metricIcon}>
              <item.icon size={18} />
            </div>
            <div>
              <h2 className={pageTw.metricTitle}>{item.value}</h2>
              <p className="mb-2 text-[0.94rem] font-bold text-app-text">{item.title}</p>
              <p className={pageTw.muted}>{item.description}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className={pageTw.gridTwo}>
        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Workspace signals</h2>
              <p className={pageTw.muted}>Useful counts for the organization context you are working in right now.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-app-mobile:grid-cols-1">
            <div className="grid gap-1 rounded-app-md border border-app-border [border-style:solid] bg-app-surface-muted p-4">
              <span className="inline-flex items-center gap-2 text-[0.84rem] font-bold text-app-text-faint uppercase">
                <Building2 size={14} />
                Organizations
              </span>
              <strong>{auth.organizations.length}</strong>
            </div>
            <div className="grid gap-1 rounded-app-md border border-app-border [border-style:solid] bg-app-surface-muted p-4">
              <span className="inline-flex items-center gap-2 text-[0.84rem] font-bold text-app-text-faint uppercase">
                <ShieldCheck size={14} />
                Preview-only surveys
              </span>
              <strong>{previewOnlyCount}</strong>
            </div>
          </div>
        </Card>
        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Suggested next steps</h2>
              <p className={pageTw.muted}>Use a simple operating rhythm so surveys move cleanly from draft to live.</p>
            </div>
          </div>
          <div className="grid gap-2.5">
            <div className="rounded-[14px] border border-app-border [border-style:solid] bg-app-surface-muted px-3.5 py-3">1. Finish the survey structure in the builder.</div>
            <div className="rounded-[14px] border border-app-border [border-style:solid] bg-app-surface-muted px-3.5 py-3">2. Publish the survey to unlock sharing.</div>
            <div className="rounded-[14px] border border-app-border [border-style:solid] bg-app-surface-muted px-3.5 py-3">3. Revisit the surveys workspace to monitor responses.</div>
          </div>
        </Card>
      </section>
    </div>
  );
};
