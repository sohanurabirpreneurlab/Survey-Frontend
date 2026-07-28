export const surveyTrackingKeys = {
  all: ["survey-tracking"] as const,
  recipients: (surveyId: string) => ["survey-tracking", "recipients", surveyId] as const,
  responsePreview: (surveyId: string, responseId: string) =>
    ["survey-tracking", "response-preview", surveyId, responseId] as const,
  responses: (surveyId: string) => ["survey-tracking", "responses", surveyId] as const,
  surveys: (page: number) => ["survey-tracking", "surveys", page] as const
};
