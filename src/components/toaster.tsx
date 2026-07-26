import { X } from "lucide-react";

import { useToastStore } from "../state/toast-store";

export const Toaster = () => {
  const { dismissToast, toasts } = useToastStore();

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <div>
            <p className="toast-title">{toast.title}</p>
            {toast.description ? <p className="toast-description">{toast.description}</p> : null}
          </div>
          <button
            aria-label="Dismiss notification"
            className="toast-dismiss"
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
