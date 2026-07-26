import { ShieldCheck, UserCog } from "lucide-react";

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
            Account and workspace configuration now have a real home in the navigation instead of a placeholder badge.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <Card className="dashboard-card">
          <div className="dashboard-card-icon">
            <UserCog size={18} />
          </div>
          <div>
            <h2>Account profile</h2>
            <p>Review the authenticated user details already coming from the backend auth contract.</p>
          </div>
        </Card>
        <Card className="dashboard-card">
          <div className="dashboard-card-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2>Access role</h2>
            <p>Admin and business-owner roles can now be surfaced cleanly here for future permissions UI.</p>
          </div>
        </Card>
      </section>

      <Card className="dashboard-empty-state">
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
            <span className="settings-label">Role</span>
            <strong>{auth.user?.role}</strong>
          </div>
          <div className="settings-item">
            <span className="settings-label">Account status</span>
            <strong>{auth.user?.accountStatus}</strong>
          </div>
        </div>
      </Card>
    </div>
  );
};
