import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { RestoreScreen } from "../../components/restore-screen";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../auth/use-auth";

export const AdminRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isRestoring) {
    return <RestoreScreen message="Checking admin access..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (auth.accessState !== "approved") {
    return <Navigate replace to="/app" />;
  }

  if (!auth.isPlatformAdmin) {
    return (
      <div className="status-page">
        <Card className="status-card">
          <div className="state-stack">
            <div>
              <h1>Access denied</h1>
              <p>You do not have permission to access the Admin Panel.</p>
            </div>
            <Button asChild>
              <Link to="/app">Return to dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <Outlet />;
};
