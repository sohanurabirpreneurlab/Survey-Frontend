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
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-[560px] p-9 max-app-mobile:p-[22px]">
          <div className="grid gap-[18px]">
            <div>
              <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Access denied</h1>
              <p className="m-0 text-app-text-soft">You do not have permission to access the Admin Panel.</p>
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
