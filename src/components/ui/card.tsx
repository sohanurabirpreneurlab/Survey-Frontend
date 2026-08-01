import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

export const Card = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) => (
  <div
    className={cn(
      "rounded-app-lg border border-[rgba(216,225,239,0.9)] [border-style:solid] bg-white/90 shadow-app",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
