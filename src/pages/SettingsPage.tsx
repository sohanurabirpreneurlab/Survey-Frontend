import { Building2, Mail, ShieldCheck, UserCog } from "lucide-react";

import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";

export const SettingsPage = () => {
  const auth = useAuth();

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1>Settings</h1>
          <p>
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

      <section className="survey-grid">
        <Card className="survey-card">
          <div className="survey-card-head">
            <div>
              <h2>Profile overview</h2>
              <p>Identity details coming directly from the current authenticated session.</p>
            </div>
          </div>
          <div className="settings-details">
            <div className="settings-item">
              <span className="settings-label">Full name</span>
              <strong>{auth.user?.fullName}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Email</span>
              <strong>{auth.user?.email}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Account status</span>
              <strong>{auth.user?.accountStatus}</strong>
            </div>
          </div>
        </Card>
        <Card className="survey-card">
          <div className="survey-card-head">
            <div>
              <h2>Role and access scope</h2>
              <p>Understand your workspace permissions before jumping into builder or admin tasks.</p>
            </div>
          </div>
          <div className="settings-details">
            <div className="settings-item">
              <span className="settings-label">Platform role</span>
              <strong>{auth.platformRole === "admin" ? "Platform Admin" : "Business Owner"}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Admin access</span>
              <strong>{auth.isPlatformAdmin ? "Enabled" : "Not available"}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Organization memberships</span>
              <strong>{auth.organizations.length}</strong>
            </div>
          </div>
        </Card>
      </section>

      <Card className="dashboard-empty-state">
        <div className="settings-details">
          {auth.organizations.map((organization) => (
            <div className="settings-item" key={organization.organizationId}>
              <span className="settings-label">Organization</span>
              <strong>{organization.organizationName}</strong>
              <span className="settings-inline-meta">
                <Building2 size={14} />
                {organization.membershipRole}
              </span>
            </div>
          ))}
          <div className="settings-item">
            <span className="settings-label">Sharing reminder</span>
            <strong>Publish before sharing</strong>
            <span className="settings-inline-meta">
              <Mail size={14} />
              Public links and invitation sends remain disabled until a survey has been published.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
