import { useSyncExternalStore, type ReactNode } from "react";

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

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const dismissalTimers = new Map<string, number>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const scheduleDismissal = (toastId: string) => {
  const existingTimer = dismissalTimers.get(toastId);

  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  const timerId = window.setTimeout(() => {
    dismissalTimers.delete(toastId);
    toastStore.dismissToast(toastId);
  }, 4500);

  dismissalTimers.set(toastId, timerId);
};

const toastStore: ToastStoreValue = {
  dismissToast: (id: string) => {
    const timerId = dismissalTimers.get(id);

    if (timerId) {
      window.clearTimeout(timerId);
      dismissalTimers.delete(id);
    }

    const nextToasts = toasts.filter((toast) => toast.id !== id);

    if (nextToasts.length === toasts.length) {
      return;
    }

    toasts = nextToasts;
    emitChange();
  },
  pushToast: (toast) => {
    const id = crypto.randomUUID();
    toasts = [...toasts, { ...toast, id }];
    scheduleDismissal(id);
    emitChange();
  },
  get toasts() {
    return toasts;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => toastStore.toasts;

export const ToastStoreProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useToastStore = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    dismissToast: toastStore.dismissToast,
    pushToast: toastStore.pushToast,
    toasts: snapshot
  };
};

export const toast = {
  danger: (title: string, description?: string) =>
    toastStore.pushToast({ description, title, tone: "danger" }),
  info: (title: string, description?: string) =>
    toastStore.pushToast({ description, title, tone: "info" }),
  success: (title: string, description?: string) =>
    toastStore.pushToast({ description, title, tone: "success" })
};
