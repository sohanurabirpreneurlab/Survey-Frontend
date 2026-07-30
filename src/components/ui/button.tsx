import { Slot } from "@radix-ui/react-slot";
import { forwardRef, useSyncExternalStore } from "react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";
import { getWriteRequestSnapshot, subscribeToWriteRequests } from "../../lib/write-request-store";

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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, children, className, size = "md", variant = "primary", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const hasActiveWriteRequest = useSyncExternalStore(
      subscribeToWriteRequests,
      getWriteRequestSnapshot,
      getWriteRequestSnapshot
    );
    const { disabled: disabledProp, ...restProps } = props;
    const disabled = !asChild && (disabledProp || hasActiveWriteRequest);

    return (
      <Comp
        className={cn(variantClassMap[variant], sizeClassMap[size], className)}
        disabled={disabled}
        ref={ref}
        {...restProps}
      >
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";
