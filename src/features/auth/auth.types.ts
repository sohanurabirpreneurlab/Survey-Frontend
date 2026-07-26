export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type AccessState = "approved" | "pending_approval" | "rejected" | "suspended";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "business_owner" | "admin";
  accountStatus: AccountStatus;
};

export type RegisterResponse = {
  emailVerificationRequired: boolean;
  requiresApproval: boolean;
  user: AuthUser;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  accessState: AccessState;
  requiresApproval: boolean;
  user: AuthUser;
};

export type CurrentUserResponse = {
  accessState: AccessState;
  requiresApproval: boolean;
  user: AuthUser;
};

export type PersistedSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};
