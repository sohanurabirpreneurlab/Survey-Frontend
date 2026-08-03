import { apiRequest, apiRequestWithMeta } from "../../lib/api";

import type {
  AdminDashboardSummary,
  CreateAdminOrganizationResult,
  AdminOrganizationDetail,
  AdminOrganizationSummary,
  AdminUserDetail,
  AdminUserSummary,
  ApproveUserResult,
  AuditLogRecord,
  PaginationMeta,
  UpdateAdminUserProfileResult,
  UpdateAdminOrganizationResult,
  UpdateUserRoleResult
} from "./admin.types";

const listWithMeta = async <T>(token: string, path: string) => {
  const response = await apiRequestWithMeta<T[]>(path, { token });
  return {
    items: response.data,
    pagination: response.meta.pagination as PaginationMeta
  };
};

export const getAdminSummaryRequest = (token: string) =>
  apiRequest<AdminDashboardSummary>("/admin/dashboard-summary", { token });

export const listAdminUsersRequest = (
  token: string,
  params: { limit: number; page: number; q?: string; status?: string }
) => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.status) {
    search.set("status", params.status);
  }
  return listWithMeta<AdminUserSummary>(token, `/admin/users?${search.toString()}`);
};

export const getAdminUserRequest = (token: string, userId: string) =>
  apiRequest<AdminUserDetail>(`/admin/users/${userId}`, { token });

export const approveAdminUserRequest = (
  token: string,
  userId: string,
  organizationName: string
) =>
  apiRequest<ApproveUserResult>(`/admin/users/${userId}/approve`, {
    body: { organizationName },
    method: "POST",
    token
  });

export const rejectAdminUserRequest = (token: string, userId: string, reason: string | null) =>
  apiRequest<null>(`/admin/users/${userId}/reject`, {
    body: { reason },
    method: "POST",
    token
  });

export const suspendAdminUserRequest = (token: string, userId: string, reason: string | null) =>
  apiRequest<null>(`/admin/users/${userId}/suspend`, {
    body: { reason },
    method: "POST",
    token
  });

export const reactivateAdminUserRequest = (token: string, userId: string) =>
  apiRequest<null>(`/admin/users/${userId}/reactivate`, {
    method: "POST",
    token
  });

export const updateAdminUserRoleRequest = (
  token: string,
  userId: string,
  platformRole: "admin" | "business_owner"
) =>
  apiRequest<UpdateUserRoleResult>(`/admin/users/${userId}/role`, {
    body: { platformRole },
    method: "PATCH",
    token
  });

export const updateAdminUserProfileRequest = (
  token: string,
  userId: string,
  payload: {
    fullName: string;
    organizationId: string | null;
  }
) =>
  apiRequest<UpdateAdminUserProfileResult>(`/admin/users/${userId}/profile`, {
    body: payload,
    method: "PATCH",
    token
  });

export const listAdminOrganizationsRequest = (
  token: string,
  params: { limit: number; page: number; q?: string }
) => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  if (params.q) {
    search.set("q", params.q);
  }
  return listWithMeta<AdminOrganizationSummary>(token, `/admin/organizations?${search.toString()}`);
};

export const getAdminOrganizationRequest = (token: string, organizationId: string) =>
  apiRequest<AdminOrganizationDetail>(`/admin/organizations/${organizationId}`, { token });

export const createAdminOrganizationRequest = (token: string, name: string) =>
  apiRequest<CreateAdminOrganizationResult>("/admin/organizations", {
    body: { name },
    method: "POST",
    token
  });

export const updateAdminOrganizationRequest = (
  token: string,
  organizationId: string,
  name: string
) =>
  apiRequest<UpdateAdminOrganizationResult>(`/admin/organizations/${organizationId}`, {
    body: { name },
    method: "PATCH",
    token
  });

export const deleteAdminOrganizationRequest = (token: string, organizationId: string) =>
  apiRequest<null>(`/admin/organizations/${organizationId}`, {
    method: "DELETE",
    token
  });

export const listAuditLogsRequest = (
  token: string,
  params: { action?: string; limit: number; page: number; targetType?: string }
) => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  if (params.action) {
    search.set("action", params.action);
  }
  if (params.targetType) {
    search.set("targetType", params.targetType);
  }
  return listWithMeta<AuditLogRecord>(token, `/admin/audit-logs?${search.toString()}`);
};
