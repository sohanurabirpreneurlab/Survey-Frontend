import { apiRequest } from "../../lib/api";

import type { CurrentUserResponse, LoginResponse, RegisterResponse } from "./auth.types";

export const registerRequest = (payload: {
  email: string;
  fullName: string;
  password: string;
}) => apiRequest<RegisterResponse>("/auth/register", { body: payload, method: "POST" });

export const loginRequest = (payload: { email: string; password: string }) =>
  apiRequest<LoginResponse>("/auth/login", { body: payload, method: "POST" });

export const refreshRequest = (refreshToken: string) =>
  apiRequest<LoginResponse>("/auth/refresh", {
    body: { refreshToken },
    method: "POST"
  });

export const getCurrentUserRequest = (token: string) =>
  apiRequest<CurrentUserResponse>("/auth/me", { token });

export const logoutRequest = (token: string) =>
  apiRequest<null>("/auth/logout", { method: "POST", token });

export const forgotPasswordRequest = (email: string) =>
  apiRequest<null>("/auth/forgot-password", {
    body: { email },
    method: "POST"
  });

export const resetPasswordRequest = (token: string, newPassword: string) =>
  apiRequest<null>("/auth/reset-password", {
    body: { newPassword },
    method: "POST",
    token
  });
