import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { getAdminOrganizationRequest } from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";

export const OrganizationDetailsPage = () => {
  const { organizationId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";

  const detailQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getAdminOrganizationRequest(token, organizationId),
    queryKey: adminKeys.organization(organizationId)
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading organization...</h1>
        </section>
      </div>
    );
  }

  const { organization, recentAudit } = detailQuery.data;

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero survey-page-hero">
        <div>
          <h1>{organization.name}</h1>
          <p>{organization.slug}</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/admin/organizations">Back to organizations</Link>
        </Button>
      </section>

      <section className="survey-grid">
        <Card className="survey-card">
          <h2>Organization information</h2>
          <div className="settings-details">
            <div className="settings-item">
              <span className="settings-label">ID</span>
              <strong>{organization.organizationId}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Created</span>
              <strong>{formatDateTime(organization.createdAt) ?? organization.createdAt}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Updated</span>
              <strong>{formatDateTime(organization.updatedAt) ?? organization.updatedAt}</strong>
            </div>
          </div>
        </Card>
        <Card className="survey-card">
          <h2>Owner</h2>
          <div className="settings-details">
            <div className="settings-item">
              <span className="settings-label">Name</span>
              <strong>{organization.owner.fullName ?? "No owner"}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Email</span>
              <strong>{organization.owner.email ?? "No email"}</strong>
            </div>
            {organization.owner.userId ? (
              <Button asChild size="sm" variant="secondary">
                <Link to={`/admin/users/${organization.owner.userId}`}>View owner</Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="survey-card">
        <h2>Survey summary</h2>
        <div className="survey-card-meta">
          <span>Total {organization.surveySummary.total}</span>
          <span>Draft {organization.surveySummary.draft}</span>
          <span>Published {organization.surveySummary.published}</span>
          <span>Closed {organization.surveySummary.closed}</span>
        </div>
      </Card>

      <Card className="survey-card">
        <h2>Members</h2>
        {organization.members.map((member) => (
          <div className="admin-list-row" key={member.userId}>
            <div>
              <strong>{member.fullName}</strong>
              <p>
                {member.email} • {member.membershipRole} • {member.accountStatus}
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to={`/admin/users/${member.userId}`}>View user</Link>
            </Button>
          </div>
        ))}
      </Card>

      <Card className="survey-card">
        <h2>Operational activity</h2>
        {recentAudit.length === 0 ? <p>No recent organization activity.</p> : null}
        {recentAudit.map((log) => (
          <div className="admin-list-row" key={log.id}>
            <div>
              <strong>{log.action}</strong>
              <p>{log.targetLabel ?? log.targetId ?? "n/a"}</p>
            </div>
            <span>{formatRelativeTime(log.createdAt)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};
