export const surveyKeys = {
  all: ["surveys"] as const,
  detail: (surveyId: string) => ["surveys", "detail", surveyId] as const,
  draft: (surveyId: string, versionId: string) =>
    ["surveys", "detail", surveyId, "version", versionId] as const,
  invitations: (surveyId: string) => ["surveys", "invitations", surveyId] as const,
  list: (filters: Record<string, string | number | null | undefined>) =>
    ["surveys", "list", filters] as const,
  organizations: ["surveys", "organizations"] as const,
  responses: (surveyId: string) => ["surveys", "responses", surveyId] as const,
  share: (surveyId: string) => ["surveys", "share", surveyId] as const
};
