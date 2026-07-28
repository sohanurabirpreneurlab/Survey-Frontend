import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

import { AccountStatusPage } from "../pages/AccountStatusPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminLayout } from "../components/layouts/AdminLayout";
import { AdminRoute } from "../features/admin/AdminRoute";
import { AuditLogsPage } from "../pages/AuditLogsPage";
import { CreateSurveyPage } from "../pages/CreateSurveyPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { OrganizationDetailsPage } from "../pages/OrganizationDetailsPage";
import { OrganizationsPage } from "../pages/OrganizationsPage";
import { PendingApprovalsPage } from "../pages/PendingApprovalsPage";
import { PublicSurveyPage, InvitationSurveyPage } from "../pages/PublicSurveyPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SettingsPage } from "../pages/SettingsPage";
import { RestoreScreen } from "../components/restore-screen";
import { AuthGate, PublicOnlyGate, StateGate } from "../features/auth/auth-routes";
import { AuthLayout } from "../components/layouts/AuthLayout";
import { DashboardLayout } from "../components/layouts/DashboardLayout";
import { useAuth } from "../features/auth/use-auth";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AdminUserDetailsPage } from "../pages/AdminUserDetailsPage";
import { SurveyTrackingPage } from "../pages/SurveyTrackingPage";
import { SurveysPage } from "../pages/SurveysPage";

const SurveyBuilderPage = lazy(() =>
  import("../pages/SurveyBuilderPage").then((module) => ({ default: module.SurveyBuilderPage }))
);
const SurveyPreviewPage = lazy(() =>
  import("../pages/SurveyPreviewPage").then((module) => ({ default: module.SurveyPreviewPage }))
);
const SurveyResponsesPage = lazy(() =>
  import("../pages/SurveyResponsesPage").then((module) => ({ default: module.SurveyResponsesPage }))
);
const SurveyTrackingResponsesPage = lazy(() =>
  import("../pages/SurveyTrackingResponsesPage").then((module) => ({ default: module.SurveyTrackingResponsesPage }))
);
const SurveyTrackingResponsePreviewPage = lazy(() =>
  import("../pages/SurveyTrackingResponsePreviewPage").then((module) => ({
    default: module.SurveyTrackingResponsePreviewPage
  }))
);

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RestoreScreen message="Loading survey workspace..." />}>{children}</Suspense>
);

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
    path: "/s/:publicSlug",
    element: <PublicSurveyPage />
  },
  {
    path: "/i/:token",
    element: <InvitationSurveyPage />
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
          { path: "tracking-surveys", element: <SurveyTrackingPage /> },
          {
            path: "tracking-surveys/:surveyId/responses",
            element: (
              <LazyRoute>
                <SurveyTrackingResponsesPage />
              </LazyRoute>
            )
          },
          {
            path: "tracking-surveys/:surveyId/responses/:responseId",
            element: (
              <LazyRoute>
                <SurveyTrackingResponsePreviewPage />
              </LazyRoute>
            )
          },
          { path: "surveys/new", element: <CreateSurveyPage /> },
          {
            path: "surveys/:surveyId/builder",
            element: (
              <LazyRoute>
                <SurveyBuilderPage />
              </LazyRoute>
            )
          },
          {
            path: "surveys/:surveyId/preview",
            element: (
              <LazyRoute>
                <SurveyPreviewPage />
              </LazyRoute>
            )
          },
          {
            path: "surveys/:surveyId/responses",
            element: (
              <LazyRoute>
                <SurveyResponsesPage />
              </LazyRoute>
            )
          },
          { path: "surveys/:surveyId/settings", element: <Navigate replace to="../builder" /> },
          { path: "settings", element: <SettingsPage /> }
        ]
      }
    ]
  },
  {
    element: <AdminRoute />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "pending-approvals", element: <PendingApprovalsPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "users/:userId", element: <AdminUserDetailsPage /> },
          { path: "organizations", element: <OrganizationsPage /> },
          { path: "organizations/:organizationId", element: <OrganizationDetailsPage /> },
          { path: "audit-logs", element: <AuditLogsPage /> }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
];
