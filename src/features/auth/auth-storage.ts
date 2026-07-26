import type { PersistedSession } from "./auth.types";

const storageKey = "survey-platform.session";

export const authStorage = {
  clear() {
    window.localStorage.removeItem(storageKey);
  },
  read(): PersistedSession | null {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as PersistedSession;
    } catch {
      return null;
    }
  },
  write(session: PersistedSession) {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }
};
