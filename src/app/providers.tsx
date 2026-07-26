import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { Toaster } from "../components/toaster";
import { queryClient } from "../lib/query-client";
import { AuthProvider } from "../features/auth/auth-provider";
import { ToastStoreProvider } from "../state/toast-store";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <ToastStoreProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ToastStoreProvider>
  </QueryClientProvider>
);
