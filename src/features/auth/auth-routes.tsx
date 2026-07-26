import type { PropsWithChildren, ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { RestoreScreen } from "../../components/restore-screen";
import type { AccessState } from "./auth.types";
import { useAuth } from "./use-auth";

const routeForState = (accessState: AccessState | null): string => {
  if (accessState === "pending_approval") {
    return "/pending-approval";
  }

  if (accessState === "rejected") {
    return "/account-rejected";
  }

  if (accessState === "suspended") {
    return "/account-suspended";
  }

  return "/app";
};

export const PublicOnlyGate = ({
  children,
  fallback
}: PropsWithChildren<{ fallback?: ReactNode }>) => {
  const auth = useAuth();

  if (auth.isRestoring) {
    return fallback ?? <RestoreScreen message="Restoring your session..." />;
  }

  if (auth.isAuthenticated) {
    return <Navigate replace to={routeForState(auth.accessState)} />;
  }

  return children ?? <Outlet />;
};

export const AuthGate = () => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isRestoring) {
    return <RestoreScreen message="Checking your account access..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (auth.accessState !== "approved") {
    return <Navigate replace to={routeForState(auth.accessState)} />;
  }

  return <Outlet />;
};

export const StateGate = ({ requiredState }: { requiredState: Exclude<AccessState, "approved"> }) => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isRestoring) {
    return <RestoreScreen message="Checking your account access..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (auth.accessState === "approved") {
    return <Navigate replace to="/app" />;
  }

  if (auth.accessState !== requiredState) {
    return <Navigate replace to={routeForState(auth.accessState)} />;
  }

  return <Outlet />;
};
