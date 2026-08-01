import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "../../lib/cn";

export const Field = ({
  children,
  error,
  hint,
  label
}: PropsWithChildren<{
  error?: string;
  hint?: string;
  label: string;
}>) => (
  <label className="grid gap-2">
    <span className="text-[0.95rem] font-semibold">{label}</span>
    {children}
    {error ? <span className="text-[0.9rem] text-app-danger">{error}</span> : null}
    {!error && hint ? <span className="text-[0.9rem] text-app-text-faint">{hint}</span> : null}
  </label>
);

export const InlineNotice = ({
  icon,
  tone = "default",
  children
}: PropsWithChildren<{ icon?: ReactNode; tone?: "default" | "danger" | "success" }>) => (
  <div
    className={cn(
      "flex items-center gap-2.5 rounded-app-sm border border-app-border [border-style:solid] px-4 py-3.5",
      tone === "default" && "bg-app-surface-muted",
      tone === "danger" && "border-[#f3c5d0] bg-app-danger-soft text-[#87223b]",
      tone === "success" && "border-[#b9e5cc] bg-app-success-soft text-app-success"
    )}
  >
    {icon ? <span>{icon}</span> : null}
    <span>{children}</span>
  </div>
);
