import type { AccountStatus, AuthOrganization, PlatformRole } from "../auth/auth.types";

export type AdminUserSummary = {
  accountStatus: AccountStatus;
  createdAt: string;
  email: string;
  fullName: string;
  organizationId: string | null;
  organizationName: string | null;
  platformRole: PlatformRole;
  updatedAt: string;
  userId: string;
};

export type AuditLogRecord = {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
  result: "failure" | "success";
  targetId: string | null;
  targetLabel: string | null;
  targetType: string;
};

export type AdminUserDetail = {
  recentAudit: AuditLogRecord[];
  user: AdminUserSummary & {
    approvedAt: string | null;
    memberships: AuthOrganization[];
    rejectedAt: string | null;
    suspendedAt: string | null;
  };
};

export type AdminDashboardSummary = {
  activeSurveys: number;
  approvedUsers: number;
  organizations: number;
  pendingApprovals: number;
  recentActivity: AuditLogRecord[];
  recentApprovals: AdminUserSummary[];
  recentPendingUsers: AdminUserSummary[];
  suspendedUsers: number;
};

export type AdminOrganizationSummary = {
  createdAt: string;
  memberCount: number;
  name: string;
  organizationId: string;
  surveyCount: number;
  updatedAt: string;
};

export type AdminOrganizationDetail = {
  organization: {
    createdAt: string;
    members: Array<{
      accountStatus: AccountStatus;
      email: string;
      fullName: string;
      membershipRole: AuthOrganization["membershipRole"];
      platformRole: PlatformRole;
      userId: string;
    }>;
    name: string;
    organizationId: string;
    owner: {
      accountStatus: AccountStatus | null;
      email: string | null;
      fullName: string | null;
      membershipRole: AuthOrganization["membershipRole"] | null;
      userId: string | null;
    };
    slug: string;
    surveySummary: {
      closed: number;
      draft: number;
      published: number;
      total: number;
    };
    updatedAt: string;
  };
  recentAudit: AuditLogRecord[];
};

export type PaginationMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type ApproveUserResult = {
  membership: { role: AuthOrganization["membershipRole"] };
  organization: { id: string; name: string };
  user: { accountStatus: AccountStatus; email: string; id: string };
};

export type UpdateUserRoleResult = {
  user: {
    id: string;
    platformRole: PlatformRole;
  };
};

export type CreateAdminOrganizationResult = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export type UpdateAdminOrganizationResult = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export type UpdateAdminUserProfileResult = {
  user: AdminUserDetail;
};
