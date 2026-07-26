import * as Dialog from "@radix-ui/react-dialog";
import { LayoutDashboard, LogOut, Menu, PanelsTopLeft, Settings, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { BrandMark } from "../brand-mark";
import { Button } from "../ui/button";
import { useAuth } from "../../features/auth/use-auth";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/surveys", label: "Surveys", icon: PanelsTopLeft },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

const NavigationContent = () => {
  const auth = useAuth();

  return (
    <div className="dashboard-sidebar-inner">
      <BrandMark />
      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
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
