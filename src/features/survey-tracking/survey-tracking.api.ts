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

export const listTrackingResponsesRequest = (token: string, surveyId: string) =>
  apiRequest<SurveyTrackingResponsesList>(`/survey-tracking/surveys/${surveyId}/responses`, { token });

export const getTrackingResponsePreviewRequest = (
  token: string,
  surveyId: string,
  responseId: string
) =>
  apiRequest<SurveyTrackingResponsePreview>(
    `/survey-tracking/surveys/${surveyId}/responses/${responseId}`,
    { token }
  );
