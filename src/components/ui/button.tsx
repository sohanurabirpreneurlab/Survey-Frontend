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
  danger: "border-transparent bg-app-danger text-white [&:hover:not(:disabled)]:bg-[#921a34]",
  ghost: "border-transparent bg-transparent text-app-text-soft [&:hover:not(:disabled)]:bg-app-surface-muted",
  primary: "border-transparent bg-app-primary text-white [&:hover:not(:disabled)]:bg-app-primary-strong",
  secondary: "border-app-border bg-white text-app-text-soft [&:hover:not(:disabled)]:bg-app-surface-muted"
} as const;

const sizeClassMap = {
  lg: "min-h-[54px] px-5",
  md: "min-h-12 px-[18px]",
  sm: "min-h-10 px-3.5"
} as const;

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border [border-style:solid] py-0 font-semibold transition-[background-color,border-color,color] duration-[140ms] disabled:cursor-not-allowed disabled:opacity-60";

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
        className={cn(baseClassName, variantClassMap[variant], sizeClassMap[size], className)}
        data-slot="button"
        data-variant={variant}
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
