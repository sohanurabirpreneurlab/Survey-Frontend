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
import { cn } from "../../lib/cn";

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
    return cn(
      "flex min-h-12 items-center gap-3 rounded-[14px] border border-transparent [border-style:solid] px-3.5 text-app-text-soft transition-[background-color,border-color,color,transform] duration-[160ms] hover:translate-x-0.5 hover:bg-white hover:no-underline",
      isActive && "border-app-border bg-white text-app-primary"
    );
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-7">
      <BrandMark />
      <nav className="grid min-w-0 gap-2" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink key={item.to} className={linkClassName(item.to, item.to === "/app")} to={item.to}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {auth.isPlatformAdmin ? (
        <div className="grid gap-3">
          <div className="grid gap-2.5">
            <span className="inline-flex w-fit items-center rounded-full border border-app-border-strong [border-style:solid] bg-app-primary-soft px-2.5 py-1.5 text-[0.82rem] font-bold text-app-primary-strong">
              Platform Admin
            </span>
          </div>
          <nav className="grid min-w-0 gap-2" aria-label="Admin">
            {adminNavItems.map((item) => (
              <NavLink key={item.to} className={linkClassName(item.to, item.to === "/admin")} to={item.to}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
      <div className="mt-auto grid w-full min-w-0 gap-3.5">
        <div className="box-border grid w-full min-w-0 gap-3 rounded-app-md border border-app-border [border-style:solid] bg-white/90 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(24,79,190,0.12)] [border-style:solid] bg-app-avatar text-app-primary-strong">
              <BadgeCheck size={16} />
            </div>
            <div className="grid w-full min-w-0 gap-1">
              <p className="mt-0 mb-1 font-semibold text-app-text [overflow-wrap:anywhere]">{auth.user?.fullName}</p>
              <p className="my-[1em] text-app-text-faint [overflow-wrap:anywhere]">{auth.user?.email}</p>
              <p className="m-0 text-[0.78rem] font-bold tracking-[0.06em] text-app-text-faint uppercase [overflow-wrap:anywhere]">
                {auth.platformRole === "admin" ? "Platform Admin" : "Business Owner"}
              </p>
            </div>
          </div>
        </div>
        <Button
          className="justify-start text-app-danger [&:hover:not(:disabled)]:bg-app-danger-soft [&:hover:not(:disabled)]:text-app-danger"
          onClick={auth.logout}
          size="sm"
          variant="ghost"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export const DashboardLayout = () => (
  <div className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)] max-app-tablet:grid-cols-1">
    <aside className="min-w-0 overflow-hidden border-r border-[rgba(193,210,234,0.8)] [border-style:solid] bg-app-sidebar p-6 max-app-tablet:hidden">
      <NavigationContent />
    </aside>
    <div className="min-w-0">
      <header className="hidden px-[18px] pt-[18px] max-app-tablet:block">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button className="w-fit" size="sm" variant="secondary">
              <Menu size={18} />
              Menu
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[rgba(18,48,79,0.28)]" />
            <Dialog.Content className="fixed inset-y-0 right-0 w-full max-w-xs border-l border-app-border [border-style:solid] bg-white p-5 shadow-app">
              <div className="mb-[18px] flex items-center justify-between">
                <BrandMark />
                <Dialog.Close asChild>
                  <button
                    aria-label="Close navigation"
                    className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent text-app-text-soft"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
              <NavigationContent />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <main className="p-8 max-app-tablet:p-5">
        <Outlet />
      </main>
    </div>
  </div>
);
