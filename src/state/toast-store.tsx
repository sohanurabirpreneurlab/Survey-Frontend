import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ToastTone = "info" | "success" | "danger";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastStoreValue = {
  dismissToast: (id: string) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  toasts: Toast[];
};

const ToastStoreContext = createContext<ToastStoreValue | null>(null);

let externalPushToast: ToastStoreValue["pushToast"] | null = null;

export const ToastStoreProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  useEffect(() => {
    externalPushToast = pushToast;
    return () => {
      externalPushToast = null;
    };
  }, [pushToast]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  const value = useMemo(
    () => ({
      dismissToast,
      pushToast,
      toasts
    }),
    [dismissToast, pushToast, toasts]
  );

  return <ToastStoreContext.Provider value={value}>{children}</ToastStoreContext.Provider>;
};

export const useToastStore = () => {
  const value = useContext(ToastStoreContext);

  if (!value) {
    throw new Error("useToastStore must be used within ToastStoreProvider.");
  }

  return value;
};

export const toast = {
  danger: (title: string, description?: string) =>
    externalPushToast?.({ description, title, tone: "danger" }),
  info: (title: string, description?: string) =>
    externalPushToast?.({ description, title, tone: "info" }),
  success: (title: string, description?: string) =>
    externalPushToast?.({ description, title, tone: "success" })
};
