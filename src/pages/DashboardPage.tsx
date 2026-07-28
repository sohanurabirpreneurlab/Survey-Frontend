import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ChartNoAxesColumn, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { listSurveysRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";

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
    <div className="dashboard-page">
      <section className="dashboard-hero dashboard-hero-split">
        <div>
          <p className="eyebrow">{auth.isPlatformAdmin ? "Platform-ready workspace" : "Approved workspace"}</p>
          <h1>Hello, {auth.user?.fullName?.split(" ")[0] ?? "there"}.</h1>
          <p>
            Keep an eye on what is still in draft, what is already live, and where your next survey action should happen.
          </p>
        </div>
        {/* <div className="dashboard-hero-aside">
          <div className="dashboard-hero-chip">
            {auth.organizations.length === 1 ? auth.organizations[0]?.organizationName : `${auth.organizations.length} organizations`}
          </div>
          <div className="dashboard-hero-chip">{auth.platformRole === "admin" ? "Platform Admin" : "Business Owner"}</div>
          <Button asChild>
            <Link to="/app/surveys/new">
              Create survey
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div> */}
      </section>

      <section className="dashboard-grid">
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
          <Card key={item.title} className="dashboard-card">
            <div className="dashboard-card-icon">
              <item.icon size={18} />
            </div>
            <div>
              <h2>{item.value}</h2>
              <p className="dashboard-card-kicker">{item.title}</p>
              <p>{item.description}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="survey-grid">
        <Card className="survey-card">
          <div className="survey-card-head">
            <div>
              <h2>Workspace signals</h2>
              <p>Useful counts for the organization context you are working in right now.</p>
            </div>
          </div>
          <div className="survey-card-meta-grid">
            <div className="survey-card-meta-box">
              <span className="survey-card-meta-label">
                <Building2 size={14} />
                Organizations
              </span>
              <strong>{auth.organizations.length}</strong>
            </div>
            <div className="survey-card-meta-box">
              <span className="survey-card-meta-label">
                <ShieldCheck size={14} />
                Preview-only surveys
              </span>
              <strong>{previewOnlyCount}</strong>
            </div>
          </div>
        </Card>
        <Card className="survey-card">
          <div className="survey-card-head">
            <div>
              <h2>Suggested next steps</h2>
              <p>Use a simple operating rhythm so surveys move cleanly from draft to live.</p>
            </div>
          </div>
          <div className="dashboard-task-list">
            <div className="dashboard-task-item">1. Finish the survey structure in the builder.</div>
            <div className="dashboard-task-item">2. Publish the survey to unlock sharing.</div>
            <div className="dashboard-task-item">3. Revisit the surveys workspace to monitor responses.</div>
          </div>
        </Card>
      </section>
    </div>
  );
};
