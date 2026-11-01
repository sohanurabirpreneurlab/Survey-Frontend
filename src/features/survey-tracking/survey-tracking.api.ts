import { apiRequest, apiRequestWithMeta } from "../../lib/api";
import type {
  SurveyTrackingResponsesList,
  SurveyTrackingInvitationRecipient,
  SurveyTrackingListResponse,
  SurveyTrackingResponsePreview,
  SurveyTrackingSummary
} from "./survey-tracking.types";

export const listTrackedSurveysRequest = async (
  token: string,
  params: { limit: number; page: number }
): Promise<SurveyTrackingListResponse> => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));

  const response = await apiRequestWithMeta<SurveyTrackingSummary[]>(
    `/survey-tracking/surveys?${search.toString()}`,
    { token }
  );

  return {
    items: response.data,
    pagination: response.meta.pagination as SurveyTrackingListResponse["pagination"]
  };
};

export const listTrackingRecipientsRequest = (token: string, surveyId: string) =>
  apiRequest<SurveyTrackingInvitationRecipient[]>(`/survey-tracking/surveys/${surveyId}/recipients`, { token });

export const listTrackingResponsesRequest = async (
  token: string,
  surveyId: string,
  params: { limit: number; page: number }
): Promise<SurveyTrackingResponsesList> => {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));

  const response = await apiRequestWithMeta<{ columns: SurveyTrackingResponsesList["columns"]; items: SurveyTrackingResponsesList["items"] }>(
    `/survey-tracking/surveys/${surveyId}/responses?${search.toString()}`,
    { token }
  );

  return {
    columns: response.data.columns,
    items: response.data.items,
    pagination: response.meta.pagination as SurveyTrackingResponsesList["pagination"]
  };
};

export const getTrackingResponsePreviewRequest = (
  token: string,
  surveyId: string,
  responseId: string
) =>
  apiRequest<SurveyTrackingResponsePreview>(
    `/survey-tracking/surveys/${surveyId}/responses/${responseId}`,
    { token }
  );

export const deleteTrackingResponseRequest = (token: string, surveyId: string, responseId: string) =>
  apiRequest<null>(`/survey-tracking/surveys/${surveyId}/responses/${responseId}`, {
    method: "DELETE",
    token
  });
