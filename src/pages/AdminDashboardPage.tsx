import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, Clock3, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { adminKeys } from "../features/admin/admin.keys";
import { getAdminSummaryRequest } from "../features/admin/admin.api";
import { useAuth } from "../features/auth/use-auth";
import { formatRelativeTime } from "../features/surveys/surveys.utils";
import { pageTw } from "../lib/page-tailwind";

export const AdminDashboardPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const summaryQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getAdminSummaryRequest(token),
    queryKey: adminKeys.summary()
  });

  if (summaryQuery.isLoading) {
    return (
      <div className={pageTw.page}>
        <section className={pageTw.hero}>
          <h1 className={pageTw.heroTitle}>Admin Dashboard</h1>
          <p className={pageTw.muted}>Loading operational summary...</p>
        </section>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Card className={pageTw.empty}>
        <div>
          <h2>We could not load the Admin Dashboard.</h2>
          <p>Try again without leaving the admin area.</p>
        </div>
        <Button onClick={() => void summaryQuery.refetch()}>Try again</Button>
      </Card>
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <p className={pageTw.eyebrow}>Platform Admin</p>
          <h1 className={pageTw.heroTitle}>Admin Dashboard</h1>
          <p className={pageTw.muted}>
            Operational overview for approvals, users, organizations, and recent admin activity.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[18px]">
        {[
          { icon: Clock3, label: "Pending approvals", value: summary.pendingApprovals },
          { icon: Users, label: "Approved users", value: summary.approvedUsers },
          { icon: ShieldCheck, label: "Suspended users", value: summary.suspendedUsers },
          { icon: Building2, label: "Organizations", value: summary.organizations },
          { icon: BarChart3, label: "Active surveys", value: summary.activeSurveys }
        ].map((item) => (
          <Card className={pageTw.metricCard} key={item.label}>
            <div className={pageTw.metricIcon}>
              <item.icon size={18} />
            </div>
            <div>
              <h2 className={pageTw.metricTitle}>{item.value}</h2>
              <p className={pageTw.muted}>{item.label}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className={pageTw.gridTwo}>
        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Recent pending registrations</h2>
              <p className={pageTw.muted}>Newest accounts waiting for approval.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/admin/pending-approvals">Open queue</Link>
            </Button>
          </div>
          {summary.recentPendingUsers.length === 0 ? <p>No pending approvals.</p> : null}
          {summary.recentPendingUsers.map((user) => (
            <div className={pageTw.listRow} key={user.userId}>
              <div>
                <strong>{user.fullName}</strong>
                <p>{user.email}</p>
              </div>
              <span>{formatRelativeTime(user.createdAt)}</span>
            </div>
          ))}
        </Card>

        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Recent approvals</h2>
              <p className={pageTw.muted}>Most recently approved accounts.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/admin/users">View users</Link>
            </Button>
          </div>
          {summary.recentApprovals.length === 0 ? <p>No recent approvals.</p> : null}
          {summary.recentApprovals.map((user) => (
            <div className={pageTw.listRow} key={user.userId}>
              <div>
                <strong>{user.fullName}</strong>
                <p>{user.organizationName ?? "No organization"}</p>
              </div>
              <span>{formatRelativeTime(user.updatedAt)}</span>
            </div>
          ))}
        </Card>
      </section>

      <Card className={pageTw.surfaceCard}>
        <div className={pageTw.cardHead}>
          <div>
            <h2 className={pageTw.cardTitle}>Recent admin activity</h2>
            <p className={pageTw.muted}>Immutable audit events from the admin panel.</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/admin/audit-logs">Audit logs</Link>
          </Button>
        </div>
        {summary.recentActivity.length === 0 ? <p>No recent activity.</p> : null}
        {summary.recentActivity.map((log) => (
          <div className={pageTw.listRow} key={log.id}>
            <div>
              <strong>{log.action}</strong>
              <p>
                {log.actorName ?? "System"} / {log.targetType} / {log.targetLabel ?? log.targetId ?? "n/a"}
              </p>
            </div>
            <span>{formatRelativeTime(log.createdAt)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};
