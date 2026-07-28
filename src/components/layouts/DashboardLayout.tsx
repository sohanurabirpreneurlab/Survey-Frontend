import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeCheck,
  Building2,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  ScanSearch,
  Settings,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { BrandMark } from "../brand-mark";
import { Button } from "../ui/button";
import { useAuth } from "../../features/auth/use-auth";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/surveys", label: "Surveys", icon: PanelsTopLeft },
  { to: "/app/tracking-surveys", label: "Tracking Survey", icon: ScanSearch },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
  { to: "/admin/pending-approvals", label: "Pending Approvals", icon: Clock3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/organizations", label: "Organizations", icon: Building2 },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: History }
];

const NavigationContent = () => {
  const auth = useAuth();
  const location = useLocation();

  const linkClassName = (itemTo: string, exact = false) => {
    const isActive = exact ? location.pathname === itemTo : location.pathname === itemTo || location.pathname.startsWith(`${itemTo}/`);
    return `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;
  };

  return (
    <div className="dashboard-sidebar-inner">
      <BrandMark />
      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink key={item.to} className={linkClassName(item.to, item.to === "/app")} to={item.to}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {auth.isPlatformAdmin ? (
        <div className="sidebar-admin-group">
          <div className="admin-sidebar-brand">
            <span className="admin-badge">Platform Admin</span>
          </div>
          <nav className="sidebar-nav" aria-label="Admin">
            {adminNavItems.map((item) => (
              <NavLink key={item.to} className={linkClassName(item.to, item.to === "/admin")} to={item.to}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-head">
            <div className="sidebar-user-avatar">
              <BadgeCheck size={16} />
            </div>
            <div className="sidebar-user-copy">
              <p className="sidebar-user-name">{auth.user?.fullName}</p>
              <p className="sidebar-user-email">{auth.user?.email}</p>
              <p className="sidebar-user-role">{auth.platformRole === "admin" ? "Platform Admin" : "Business Owner"}</p>
            </div>
          </div>
        </div>
        <Button className="sidebar-logout" onClick={auth.logout} size="sm" variant="ghost">
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export const DashboardLayout = () => (
  <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <NavigationContent />
    </aside>
    <div className="dashboard-main-shell">
      <header className="dashboard-topbar">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button className="mobile-nav-trigger" size="sm" variant="secondary">
              <Menu size={18} />
              Menu
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="mobile-nav-drawer">
              <div className="mobile-nav-header">
                <BrandMark />
                <Dialog.Close asChild>
                  <button aria-label="Close navigation" className="mobile-nav-close" type="button">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
              <NavigationContent />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  </div>
);
