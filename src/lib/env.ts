const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1");

const salthubAllowedOrigins = (import.meta.env.VITE_SALTHUB_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin: string) => trimTrailingSlash(origin.trim()))
  .filter(Boolean);

export const env = {
  apiBaseUrl,
  backendBaseUrl: apiBaseUrl.replace(/\/api\/v1$/, ""),
  appName: import.meta.env.VITE_APP_NAME ?? "Survey Platform",
  salthubAllowedOrigins
};
