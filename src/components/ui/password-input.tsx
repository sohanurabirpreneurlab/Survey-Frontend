import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";
import { Input } from "./input";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        className={cn("pr-[52px]", className)}
        ref={ref}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-0 inline-flex h-full cursor-pointer items-center justify-center border-0 bg-transparent px-3.5 py-0 text-app-text-soft hover:text-app-text focus-visible:rounded-[14px] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(24,79,190,0.18)]"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
