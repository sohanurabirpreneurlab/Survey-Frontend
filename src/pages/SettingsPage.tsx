import { Building2, Mail, ShieldCheck, UserCog } from "lucide-react";

import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { pageTw } from "../lib/page-tailwind";

export const SettingsPage = () => {
  const auth = useAuth();

  return (
    <div className={pageTw.page}>
      <section className={pageTw.hero}>
        <div>
          <p className={pageTw.eyebrow}>Workspace settings</p>
          <h1 className={pageTw.heroTitle}>Settings</h1>
          <p className={pageTw.muted}>
            Review your account identity, role scope, and organization context so the workspace stays understandable.
          </p>
        </div>
      </section>

      {/* <section className="dashboard-grid">
        <Card className="dashboard-card">
          <div className="dashboard-card-icon">
            <UserCog size={18} />
          </div>
          <div>
            <h2>Account profile</h2>
            <p>Keep your core identity details visible in one place without digging through different screens.</p>
          </div>
        </Card>
        <Card className="dashboard-card">
          <div className="dashboard-card-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2>Access role</h2>
            <p>See why some routes allow editing while others only allow preview or review access.</p>
          </div>
        </Card>
      </section> */}

      <section className={pageTw.gridTwo}>
        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Profile overview</h2>
              <p className={pageTw.muted}>Identity details coming directly from the current authenticated session.</p>
            </div>
          </div>
          <div className={pageTw.details}>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Full name</span>
              <strong>{auth.user?.fullName}</strong>
            </div>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Email</span>
              <strong>{auth.user?.email}</strong>
            </div>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Account status</span>
              <strong>{auth.user?.accountStatus}</strong>
            </div>
          </div>
        </Card>
        <Card className={pageTw.surfaceCard}>
          <div className={pageTw.cardHead}>
            <div>
              <h2 className={pageTw.cardTitle}>Role and access scope</h2>
              <p className={pageTw.muted}>Understand your workspace permissions before jumping into builder or admin tasks.</p>
            </div>
          </div>
          <div className={pageTw.details}>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Platform role</span>
              <strong>{auth.platformRole === "admin" ? "Platform Admin" : "Business Owner"}</strong>
            </div>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Admin access</span>
              <strong>{auth.isPlatformAdmin ? "Enabled" : "Not available"}</strong>
            </div>
            <div className={pageTw.inset}>
              <span className={pageTw.label}>Organization memberships</span>
              <strong>{auth.organizations.length}</strong>
            </div>
          </div>
        </Card>
      </section>

      <Card className={pageTw.empty}>
        <div className={pageTw.details}>
          {auth.organizations.map((organization) => (
            <div className={pageTw.inset} key={organization.organizationId}>
              <span className={pageTw.label}>Organization</span>
              <strong>{organization.organizationName}</strong>
              <span className={pageTw.inlineMeta}>
                <Building2 size={14} />
                {organization.membershipRole}
              </span>
            </div>
          ))}
          <div className={pageTw.inset}>
            <span className={pageTw.label}>Sharing reminder</span>
            <strong>Publish before sharing</strong>
            <span className={pageTw.inlineMeta}>
              <Mail size={14} />
              Public links and invitation sends remain disabled until a survey has been published.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
