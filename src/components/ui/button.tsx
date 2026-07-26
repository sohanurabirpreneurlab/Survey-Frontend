import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
>;

const variantClassMap = {
  danger: "button button-danger",
  ghost: "button button-ghost",
  primary: "button button-primary",
  secondary: "button button-secondary"
} as const;

const sizeClassMap = {
  lg: "button-lg",
  md: "button-md",
  sm: "button-sm"
} as const;

export const Button = ({
  asChild,
  children,
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(variantClassMap[variant], sizeClassMap[size], className)}
      {...props}
    >
      {children}
    </Comp>
  );
};
