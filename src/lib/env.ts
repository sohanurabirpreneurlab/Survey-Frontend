const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const env = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1"),
  appName: import.meta.env.VITE_APP_NAME ?? "Survey Platform"
};
