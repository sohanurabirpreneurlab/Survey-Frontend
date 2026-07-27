import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Users,
  X
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { BrandMark } from "../brand-mark";
import { Button } from "../ui/button";
import { useAuth } from "../../features/auth/use-auth";

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pending-approvals", label: "Pending Approvals", icon: Clock3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/organizations", label: "Organizations", icon: Building2 },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: History }
];

const AdminNavigationContent = () => {
  const auth = useAuth();

  return (
    <div className="dashboard-sidebar-inner">
      <div className="admin-sidebar-brand">
        <BrandMark />
        <span className="admin-badge">Platform Admin</span>
      </div>
      <nav aria-label="Admin" className="sidebar-nav">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            to={item.to}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <p className="sidebar-user-name">{auth.user?.fullName}</p>
          <p className="sidebar-user-email">{auth.user?.email}</p>
        </div>
        <div className="admin-workspace-switch">
          <Button asChild size="sm" variant="secondary">
            <NavLink to="/app">
              <PanelsTopLeft size={16} />
              Business Workspace
            </NavLink>
          </Button>
          <Button className="sidebar-logout" onClick={auth.logout} size="sm" variant="ghost">
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AdminLayout = () => (
  <div className="dashboard-shell admin-shell">
    <aside className="dashboard-sidebar admin-sidebar">
      <AdminNavigationContent />
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
              <AdminNavigationContent />
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
