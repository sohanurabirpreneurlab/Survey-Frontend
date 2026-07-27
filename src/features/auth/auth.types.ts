export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type AccessState = "approved" | "pending_approval" | "rejected" | "suspended";
export type PlatformRole = "business_owner" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  accountStatus: AccountStatus;
};

export type AuthOrganization = {
  membershipRole: "owner" | "admin" | "editor" | "analyst" | "viewer";
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
};

export type PublicOrganizationOption = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
};

export type RegisterResponse = {
  emailVerificationRequired: boolean;
  isPlatformAdmin: boolean;
  organizations: AuthOrganization[];
  platformRole: PlatformRole;
  requiresApproval: boolean;
  user: AuthUser;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  accessState: AccessState;
  isPlatformAdmin: boolean;
  organizations: AuthOrganization[];
  platformRole: PlatformRole;
  requiresApproval: boolean;
  user: AuthUser;
};

export type CurrentUserResponse = {
  accessState: AccessState;
  isPlatformAdmin: boolean;
  organizations: AuthOrganization[];
  platformRole: PlatformRole;
  requiresApproval: boolean;
  user: AuthUser;
};

export type PersistedSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};
