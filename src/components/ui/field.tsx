import type { PropsWithChildren, ReactNode } from "react";

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
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {error ? <span className="field-error">{error}</span> : null}
    {!error && hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

export const InlineNotice = ({
  icon,
  tone = "default",
  children
}: PropsWithChildren<{ icon?: ReactNode; tone?: "default" | "danger" | "success" }>) => (
  <div className={`inline-notice inline-notice-${tone}`}>
    {icon ? <span className="inline-notice-icon">{icon}</span> : null}
    <span>{children}</span>
  </div>
);
