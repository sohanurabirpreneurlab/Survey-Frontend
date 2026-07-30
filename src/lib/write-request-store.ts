let activeWriteRequestCount = 0;

const listeners = new Set<() => void>();

const notifyListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const beginWriteRequest = () => {
  activeWriteRequestCount += 1;
  notifyListeners();
};

export const endWriteRequest = () => {
  activeWriteRequestCount = Math.max(0, activeWriteRequestCount - 1);
  notifyListeners();
};

export const subscribeToWriteRequests = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getWriteRequestSnapshot = () => activeWriteRequestCount > 0;
