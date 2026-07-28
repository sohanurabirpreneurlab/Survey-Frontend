export const surveyStatuses = ["draft", "published", "closed", "archived"] as const;
export const surveyAccessModes = [
  "public",
  "invite_only",
  "authenticated",
  "organization_only"
] as const;
export const questionTypes = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "yes_no",
  "rating",
  "vote"
] as const;

export type SurveyStatus = (typeof surveyStatuses)[number];
export type SurveyAccessMode = (typeof surveyAccessModes)[number];
export type QuestionType = (typeof questionTypes)[number];

export type SurveyVersionSettings = {
  allowBackNavigation: boolean;
  confirmationMessage: string;
  oneQuestionPerPage: boolean;
  redirectUrl: string | null;
  showConfirmationPage: boolean;
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  shuffleOptions: boolean;
  shuffleQuestions: boolean;
  theme: {
    logoUrl: string | null;
    primaryColor: string | null;
  };
};

export type Survey = {
  accessMode: SurveyAccessMode;
  access: {
    canEdit: boolean;
    canRead: boolean;
    isCrossOrganizationPreview: boolean;
    message: string | null;
    reason: "admin" | "organization_edit" | "organization_read_only" | "cross_organization_preview";
  };
  closesAt: string | null;
  createdAt: string;
  createdBy: string;
  currentDraftVersionId: string | null;
  deletedAt: string | null;
  id: string;
  opensAt: string | null;
  organizationId: string;
  publicSlug: string;
  publishedVersionId: string | null;
  responseLimit: number | null;
  slug: string;
  status: SurveyStatus;
  updatedAt: string;
};

export type SurveyVersion = {
  archivedAt: string | null;
  changeSummary: string | null;
  createdAt: string;
  createdBy: string;
  createdFromVersionId: string | null;
  description: string | null;
  id: string;
  publishedAt: string | null;
  publishedBy: string | null;
  settings: SurveyVersionSettings;
  status: "draft" | "published" | "archived";
  surveyId: string;
  title: string;
  updatedAt: string;
  versionNumber: number;
};

export type SurveySummary = Survey & {
  currentDraftVersionNumber: number | null;
  description: string | null;
  inProgressResponseCount: number;
  publishedVersionNumber: number | null;
  submittedResponseCount: number;
  title: string | null;
};

export type SurveySection = {
  createdAt: string;
  description: string | null;
  id: string;
  position: number;
  stableKey: string;
  surveyVersionId: string;
  title: string;
  updatedAt: string;
};

export type QuestionDisplayLogic = {
  conditions?: Array<{
    operator: string;
    questionStableKey: string;
    value: unknown;
  }>;
};

export type QuestionValidation = Record<string, unknown>;

export type Question = {
  createdAt: string;
  description: string | null;
  displayLogic: QuestionDisplayLogic;
  id: string;
  position: number;
  required: boolean;
  sectionId: string;
  settings: Record<string, unknown>;
  stableKey: string;
  surveyVersionId: string;
  title: string;
  type: QuestionType;
  updatedAt: string;
  validation: QuestionValidation;
};

export type QuestionOption = {
  createdAt: string;
  id: string;
  label: string;
  position: number;
  questionId: string;
  settings: Record<string, unknown>;
  stableKey: string;
  updatedAt: string;
  value: string;
};

export type SurveyVersionDefinition = {
  options: QuestionOption[];
  questions: Question[];
  sections: SurveySection[];
  version: SurveyVersion;
};

export type OrganizationSummary = {
  membership: {
    id: string;
    organizationId: string;
    role: "owner" | "admin" | "editor" | "analyst" | "viewer";
    userId: string;
  };
  organization: {
    createdAt: string;
    createdBy: string;
    deletedAt: string | null;
    id: string;
    name: string;
    slug: string;
    updatedAt: string;
  };
  permissions: {
    canCloseSurvey: boolean;
    canCreateSurvey: boolean;
    canEditDraft: boolean;
    canManageMembers: boolean;
    canPublishSurvey: boolean;
    canReadSurvey: boolean;
  };
};

export type PaginationMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type QuestionResults = {
  options: Array<{
    label: string;
    optionId: string;
    percentage: number;
    voteCount: number;
  }>;
  questionId: string;
  totalVotes: number;
};

export type SurveyResponseSummary = {
  inProgressCount: number;
  submittedCount: number;
  surveyId: string;
};

export type SurveyShareInfo = {
  accessMode: SurveyAccessMode;
  publicSlug: string;
  publicUrl: string;
  surveyId: string;
  title: string | null;
};

export type InvitationListItem = {
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  firstOpenedAt: string | null;
  id: string;
  lastOpenedAt: string | null;
  maxResponses: number;
  metadata: Record<string, unknown>;
  recipientEmail: string | null;
  recipientEmailHash: string;
  responseCount: number;
  revokedAt: string | null;
  startedAt: string | null;
  status: "pending" | "sent" | "delivered" | "opened" | "started" | "completed" | "bounced" | "failed" | "revoked" | "expired";
  surveyId: string;
  surveyVersionId: string;
  updatedAt: string;
};

export type CreateInvitationsBatchResult = {
  createdCount: number;
  failedCount: number;
  failedRecipients: Array<{
    code?: string;
    email: string;
    message: string;
  }>;
  invitations: InvitationListItem[];
  sentCount: number;
};
