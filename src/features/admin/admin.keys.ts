export const adminKeys = {
  all: ["admin"] as const,
  auditLogs: (filters: Record<string, string | number | undefined>) =>
    ["admin", "audit-logs", filters] as const,
  organization: (organizationId: string) => ["admin", "organization", organizationId] as const,
  organizations: (filters: Record<string, string | number | undefined>) =>
    ["admin", "organizations", filters] as const,
  summary: () => ["admin", "summary"] as const,
  user: (userId: string) => ["admin", "user", userId] as const,
  users: (filters: Record<string, string | number | undefined>) =>
    ["admin", "users", filters] as const
};
