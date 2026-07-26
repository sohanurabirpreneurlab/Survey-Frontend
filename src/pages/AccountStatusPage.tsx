import { Clock3, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../features/auth/use-auth";

type Accent = "pending" | "danger";

export const AccountStatusPage = ({
  accent,
  description,
  title
}: {
  accent: Accent;
  description: string;
  title: string;
}) => {
  const auth = useAuth();

  return (
    <div className="status-page">
      <Card className="status-card">
        <div className="state-stack">
          <div className={`status-icon ${accent === "pending" ? "status-icon-pending" : "status-icon-danger"}`}>
            {accent === "pending" ? <Clock3 size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <p className="eyebrow">Access state</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="status-account-summary">
            <p>{auth.user?.fullName}</p>
            <span>{auth.user?.email}</span>
          </div>
          <div className="status-actions">
            <Button onClick={auth.logout} variant="secondary">
              Sign out
            </Button>
            <Button asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
