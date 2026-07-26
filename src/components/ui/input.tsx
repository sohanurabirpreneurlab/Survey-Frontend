import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input className={cn("input", className)} ref={ref} {...props} />
));

Input.displayName = "Input";
