import { apiRequest, apiRequestWithMeta } from "../../lib/api";

import type {
  CalculatedScoreCalculationType,
  CalculatedScoreTargetType,
  CalculatedScoreThresholdOperator,
  CreateInvitationsBatchResult,
  InvitationListItem,
  OrganizationSummary,
  PaginationMeta,
  Question,
  QuestionOption,
  Survey,
  SurveyCalculatedScore,
  SurveyShareInfo,
  SurveyResponseSummary,
  SurveySection,
  SurveySummary,
  SurveyVersion,
  SurveyVersionDefinition,
  SurveyVersionSettings
} from "./surveys.types";

export const listOrganizationsRequest = (token: string) =>
  apiRequest<OrganizationSummary[]>("/organizations", { token });

export const listSurveysRequest = async (
  token: string,
  params: { limit: number; organizationId?: string; page: number }
): Promise<{ items: SurveySummary[]; pagination: PaginationMeta }> => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));

  if (params.organizationId) {
    search.set("organizationId", params.organizationId);
  }

  const response = await apiRequestWithMeta<SurveySummary[]>(`/surveys?${search.toString()}`, { token });

  return {
    items: response.data,
    pagination: response.meta.pagination as PaginationMeta
  };
};

export const createSurveyRequest = (
  token: string,
  payload: {
    accessMode: Survey["accessMode"];
    closesAt: string | null;
    description: string | null;
    opensAt: string | null;
    organizationId: string;
    settings: SurveyVersionSettings;
    slug: string;
    title: string;
  }
) =>
  apiRequest<{ draftVersion: SurveyVersion; survey: Survey }>("/surveys", {
    body: payload,
    method: "POST",
    token
  });

export const getSurveyRequest = (token: string, surveyId: string) =>
  apiRequest<Survey>(`/surveys/${surveyId}`, { token });

export const getSurveyShareRequest = (token: string, surveyId: string) =>
  apiRequest<SurveyShareInfo>(`/surveys/${surveyId}/share`, { token });

export const listSurveyInvitationsRequest = (token: string, surveyId: string) =>
  apiRequest<InvitationListItem[]>(`/surveys/${surveyId}/invitations`, { token });

export const sendSurveyInvitationsRequest = (
  token: string,
  surveyId: string,
  payload: {
    expiresAt?: string | null;
    maxResponses?: number;
    recipients: Array<{ email: string }>;
  }
) =>
  apiRequest<CreateInvitationsBatchResult>(`/surveys/${surveyId}/invitations`, {
    body: payload,
    method: "POST",
    token
  });

export const getSurveyVersionRequest = (token: string, surveyId: string, versionId: string) =>
  apiRequest<SurveyVersionDefinition>(`/surveys/${surveyId}/versions/${versionId}`, { token });

export const updateSurveyRequest = (
  token: string,
  surveyId: string,
  payload: {
    accessMode: Survey["accessMode"];
    closesAt: string | null;
    opensAt: string | null;
    responseLimit: number | null;
    slug: string;
  }
) =>
  apiRequest<Survey>(`/surveys/${surveyId}`, { body: payload, method: "PATCH", token });

export const updateDraftRequest = (
  token: string,
  surveyId: string,
  payload: {
    changeSummary: string | null;
    description: string | null;
    settings: SurveyVersionSettings;
    title: string;
  }
) =>
  apiRequest<SurveyVersion>(`/surveys/${surveyId}/draft`, { body: payload, method: "PATCH", token });

export const createDraftRequest = (token: string, surveyId: string, changeSummary?: string) =>
  apiRequest<SurveyVersion>(`/surveys/${surveyId}/draft`, {
    body: { changeSummary: changeSummary ?? null },
    method: "POST",
    token
  });

export const publishDraftRequest = (token: string, surveyId: string) =>
  apiRequest<SurveyVersion>(`/surveys/${surveyId}/publish`, { method: "POST", token });

export const closeSurveyRequest = (token: string, surveyId: string) =>
  apiRequest<Survey>(`/surveys/${surveyId}/close`, { method: "POST", token });

export const reopenSurveyRequest = (token: string, surveyId: string) =>
  apiRequest<Survey>(`/surveys/${surveyId}/reopen`, { method: "POST", token });

export const createSectionRequest = (
  token: string,
  surveyId: string,
  payload: { description: string | null; position: number; settings: Record<string, unknown>; title: string }
) =>
  apiRequest<SurveySection>(`/surveys/${surveyId}/draft/sections`, {
    body: payload,
    method: "POST",
    token
  });

export const updateSectionRequest = (
  token: string,
  surveyId: string,
  sectionId: string,
  payload: { description: string | null; position: number; settings: Record<string, unknown>; title: string }
) =>
  apiRequest<SurveySection>(`/surveys/${surveyId}/draft/sections/${sectionId}`, {
    body: payload,
    method: "PATCH",
    token
  });

export const deleteSectionRequest = (token: string, surveyId: string, sectionId: string) =>
  apiRequest<null>(`/surveys/${surveyId}/draft/sections/${sectionId}`, {
    method: "DELETE",
    token
  });

export const reorderSectionsRequest = (
  token: string,
  surveyId: string,
  items: Array<{ position: number; sectionId: string }>
) =>
  apiRequest<SurveySection[]>(`/surveys/${surveyId}/draft/sections/reorder`, {
    body: { items },
    method: "PATCH",
    token
  });

export const createQuestionRequest = (
  token: string,
  surveyId: string,
  payload: {
    description: string | null;
    displayLogic: Record<string, unknown>;
    options: Array<{ label: string; position: number; settings: Record<string, unknown>; value: string }>;
    position: number;
    required: boolean;
    sectionId: string;
    settings: Record<string, unknown>;
    title: string;
    type: Question["type"];
    validation: Record<string, unknown>;
  }
) =>
  apiRequest<Question>(`/surveys/${surveyId}/draft/questions`, {
    body: payload,
    method: "POST",
    token
  });

export const updateQuestionRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  payload: {
    confirmRemoveOptions?: boolean;
    description: string | null;
    displayLogic: Record<string, unknown>;
    position: number;
    required: boolean;
    settings: Record<string, unknown>;
    title: string;
    type: Question["type"];
    validation: Record<string, unknown>;
  }
) =>
  apiRequest<Question>(`/surveys/${surveyId}/draft/questions/${questionId}`, {
    body: payload,
    method: "PATCH",
    token
  });

export const deleteQuestionRequest = (token: string, surveyId: string, questionId: string) =>
  apiRequest<null>(`/surveys/${surveyId}/draft/questions/${questionId}`, {
    method: "DELETE",
    token
  });

export const reorderQuestionsRequest = (
  token: string,
  surveyId: string,
  sectionId: string,
  items: Array<{ position: number; questionId: string }>
) =>
  apiRequest<Question[]>(`/surveys/${surveyId}/draft/questions/reorder`, {
    body: { items, sectionId },
    method: "PATCH",
    token
  });

export const createOptionRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  payload: { label: string; position: number; settings: Record<string, unknown>; value: string }
) =>
  apiRequest<QuestionOption>(`/surveys/${surveyId}/draft/questions/${questionId}/options`, {
    body: payload,
    method: "POST",
    token
  });

export const updateOptionRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  optionId: string,
  payload: { label: string; position: number; scoreValue: number | null; settings: Record<string, unknown>; value: string }
) =>
  apiRequest<QuestionOption>(`/surveys/${surveyId}/draft/questions/${questionId}/options/${optionId}`, {
    body: payload,
    method: "PATCH",
    token
  });

export const bulkUpdateOptionScoresRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  payload: {
    options: Array<{
      optionId: string;
      scoreValue: number | null;
    }>;
  }
) =>
  apiRequest<QuestionOption[]>(`/surveys/${surveyId}/draft/questions/${questionId}/options/scores`, {
    body: payload,
    method: "PATCH",
    token
  });

export const deleteOptionRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  optionId: string
) =>
  apiRequest<null>(`/surveys/${surveyId}/draft/questions/${questionId}/options/${optionId}`, {
    method: "DELETE",
    token
  });

export const reorderOptionsRequest = (
  token: string,
  surveyId: string,
  questionId: string,
  items: Array<{ optionId: string; position: number }>
) =>
  apiRequest<QuestionOption[]>(`/surveys/${surveyId}/draft/questions/${questionId}/options/reorder`, {
    body: { items },
    method: "PATCH",
    token
  });

export const getSurveyResultsRequest = (token: string, surveyId: string) =>
  apiRequest<SurveyResponseSummary>(`/surveys/${surveyId}/results`, { token });

type CalculatedScorePayload = {
  calculationType: CalculatedScoreCalculationType;
  decimalPlaces: number;
  key: string;
  name: string;
  requireAllAnswers: boolean;
  sourceQuestionIds: string[];
  targets: Array<{
    targetId: string;
    targetType: CalculatedScoreTargetType;
  }>;
  thresholdOperator: CalculatedScoreThresholdOperator;
  thresholdValue: number;
};

export const createCalculatedScoreRequest = (token: string, surveyId: string, payload: CalculatedScorePayload) =>
  apiRequest<SurveyCalculatedScore>(`/surveys/${surveyId}/draft/calculated-scores`, {
    body: payload,
    method: "POST",
    token
  });

export const updateCalculatedScoreRequest = (
  token: string,
  surveyId: string,
  calculatedScoreId: string,
  payload: CalculatedScorePayload
) =>
  apiRequest<SurveyCalculatedScore>(`/surveys/${surveyId}/draft/calculated-scores/${calculatedScoreId}`, {
    body: payload,
    method: "PATCH",
    token
  });

export const deleteCalculatedScoreRequest = (token: string, surveyId: string, calculatedScoreId: string) =>
  apiRequest<null>(`/surveys/${surveyId}/draft/calculated-scores/${calculatedScoreId}`, {
    method: "DELETE",
    token
  });
