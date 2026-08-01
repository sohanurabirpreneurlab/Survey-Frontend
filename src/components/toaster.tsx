import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { useToastStore } from "../state/toast-store";

export const Toaster = () => {
  const { dismissToast, toasts } = useToastStore();

  return (
    <div
      className="fixed right-5 bottom-5 z-50 grid w-[min(360px,calc(100vw-32px))] gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start justify-between gap-3 rounded-2xl border border-app-border [border-style:solid] bg-white p-4 shadow-app",
            toast.tone === "success" && "border-[#b9e5cc]",
            toast.tone === "danger" && "border-[#f0bbc9]"
          )}
        >
          <div>
            <p className="m-0 font-bold text-app-text">{toast.title}</p>
            {toast.description ? <p className="mt-0.5 mb-0 text-app-text-soft">{toast.description}</p> : null}
          </div>
          <button
            aria-label="Dismiss notification"
            className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent text-app-text-soft"
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
