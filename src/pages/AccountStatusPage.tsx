import { Clock3, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../features/auth/use-auth";
import { cn } from "../lib/cn";

type Accent = "pending" | "danger";

export const AccountStatusPage = ({
  accent,
  description,
  title
}: {
  accent: Accent;
  description: string;
  title: string;
}) => {
  const auth = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-[560px] p-9 max-app-mobile:p-[22px]">
        <div className="grid gap-[18px]">
          <div
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-2xl",
              accent === "pending"
                ? "bg-app-warning-soft text-app-warning"
                : "bg-app-danger-soft text-app-danger"
            )}
          >
            {accent === "pending" ? <Clock3 size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <p className="mt-0 mb-3 text-[0.82rem] font-bold tracking-[0.08em] text-app-primary uppercase">Access state</p>
            <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">{title}</h1>
            <p className="m-0 text-app-text-soft">{description}</p>
          </div>
          <div className="rounded-app-md border border-app-border [border-style:solid] bg-app-surface-muted p-4">
            <p className="mt-0 mb-1 font-semibold text-app-text">{auth.user?.fullName}</p>
            <span className="text-app-text-faint">{auth.user?.email}</span>
          </div>
          <div className="flex flex-wrap gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
            <Button onClick={auth.logout} variant="secondary">
              Sign out
            </Button>
            <Button asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
