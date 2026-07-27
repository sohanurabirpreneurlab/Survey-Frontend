import { env } from "./env";
import { toast } from "../state/toast-store";

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta: Record<string, unknown> & {
    requestId: string | null;
  };
};

export type ApiValidationIssue = {
  location: string;
  message: string;
  path: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details: ApiValidationIssue[] | string | null;
  };
  meta: {
    requestId: string | null;
  };
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly details: ApiErrorResponse["error"]["details"];
  public readonly requestId: string | null;
  public readonly status: number;

  public constructor(status: number, payload: ApiErrorResponse) {
    super(payload.error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.error.code;
    this.details = payload.error.details;
    this.requestId = payload.meta.requestId;
  }
}

type RequestOptions = {
  baseUrl?: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  credentials?: RequestCredentials;
  token?: string;
  headers?: HeadersInit;
};

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json"
};

let lastSessionExpiryToastAt = 0;

const maybeShowSessionExpiryToast = (status: number, payload: ApiErrorResponse) => {
  if (status !== 401) {
    return;
  }

  if (!["AUTHENTICATION_REQUIRED", "AUTH_SESSION_EXPIRED", "INVALID_AUTH_TOKEN"].includes(payload.error.code)) {
    return;
  }

  if (Date.now() - lastSessionExpiryToastAt < 5000) {
    return;
  }

  lastSessionExpiryToastAt = Date.now();
  toast.danger("Session expired", "Please log in again to continue.");
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const payload = await apiRequestWithMeta<T>(path, options);
  return payload.data;
};

export const apiRequestWithMeta = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiSuccessResponse<T>> => {
  const response = await fetch(`${options.baseUrl ?? env.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: options.credentials,
    headers: {
      ...defaultHeaders,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    maybeShowSessionExpiryToast(response.status, payload as ApiErrorResponse);
    throw new ApiError(response.status, payload as ApiErrorResponse);
  }

  return payload;
};
