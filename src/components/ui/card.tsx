import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

export const Card = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) => (
  <div className={cn("card", className)} {...props}>
    {children}
  </div>
);
