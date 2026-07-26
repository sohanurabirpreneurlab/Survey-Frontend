import { env } from "./env";

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta: {
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
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
};

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json"
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...defaultHeaders,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new ApiError(response.status, payload as ApiErrorResponse);
  }

  return payload.data;
};
