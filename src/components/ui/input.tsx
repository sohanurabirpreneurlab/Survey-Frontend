import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const inputClassName =
  "min-h-[50px] w-full appearance-none rounded-[14px] border border-app-border [border-style:solid] bg-white px-4 py-0 text-app-text outline-none transition-[border-color,box-shadow] duration-[140ms] focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    className={cn(
      inputClassName,
      className
    )}
    ref={ref}
    {...props}
  />
));

Input.displayName = "Input";
