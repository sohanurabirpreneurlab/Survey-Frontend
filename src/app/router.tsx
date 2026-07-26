import { Navigate } from "react-router-dom";

import { AccountStatusPage } from "../pages/AccountStatusPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SurveysPage } from "../pages/SurveysPage";
import { AuthGate, PublicOnlyGate, StateGate } from "../features/auth/auth-routes";
import { AuthLayout } from "../components/layouts/AuthLayout";
import { DashboardLayout } from "../components/layouts/DashboardLayout";
import { RestoreScreen } from "../components/restore-screen";
import { useAuth } from "../features/auth/use-auth";

function RootRedirect() {
  return <RootRedirectContent />;
}

function RootRedirectContent() {
  const auth = useAuth();

  if (auth.isRestoring) {
    return <RestoreScreen message="Restoring your session..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (auth.accessState === "pending_approval") {
    return <Navigate replace to="/pending-approval" />;
  }

  if (auth.accessState === "rejected") {
    return <Navigate replace to="/account-rejected" />;
  }

  if (auth.accessState === "suspended") {
    return <Navigate replace to="/account-suspended" />;
  }

  return <Navigate replace to="/app" />;
}

export const appRoutes = [
  {
    path: "/",
    element: <RootRedirect />
  },
  {
    element: <PublicOnlyGate />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> }
        ]
      }
    ]
  },
  {
    element: <StateGate requiredState="pending_approval" />,
    children: [
      {
        path: "/pending-approval",
        element: (
          <AccountStatusPage
            title="Account pending approval"
            description="Your registration was successful. You can sign in, but dashboard access will stay locked until your account is approved."
            accent="pending"
          />
        )
      }
    ]
  },
  {
    element: <StateGate requiredState="rejected" />,
    children: [
      {
        path: "/account-rejected",
        element: (
          <AccountStatusPage
            title="Account rejected"
            description="This account is not currently allowed to access the survey dashboard. Contact support if you believe this is a mistake."
            accent="danger"
          />
        )
      }
    ]
  },
  {
    element: <StateGate requiredState="suspended" />,
    children: [
      {
        path: "/account-suspended",
        element: (
          <AccountStatusPage
            title="Account suspended"
            description="This account has been suspended. Contact support to review the account and restore access."
            accent="danger"
          />
        )
      }
    ]
  },
  {
    element: <AuthGate />,
    children: [
      {
        path: "/app",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "surveys", element: <SurveysPage /> },
          { path: "settings", element: <SettingsPage /> }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
];
