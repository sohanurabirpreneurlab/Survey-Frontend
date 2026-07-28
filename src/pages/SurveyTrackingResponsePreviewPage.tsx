import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { getTrackingResponsePreviewRequest } from "../features/survey-tracking/survey-tracking.api";
import { surveyTrackingKeys } from "../features/survey-tracking/survey-tracking.keys";
import { formatDateTime } from "../features/surveys/surveys.utils";

const readAnswerValue = (
  questionType: string,
  answer:
    | {
        optionIds: string[];
        valueBoolean: boolean | null;
        valueDate: string | null;
        valueJson: unknown;
        valueNumber: number | null;
        valueText: string | null;
        valueTimestamp: string | null;
      }
    | undefined,
  options: Array<{ id: string; label: string; questionId: string }>
) => {
  if (!answer) {
    return "No answer";
  }

  if (questionType === "single_choice" || questionType === "vote") {
    return options.find((option) => option.id === answer.valueText)?.label ?? answer.valueText ?? "No answer";
  }

  if (questionType === "multiple_choice") {
    return answer.optionIds.length > 0
      ? answer.optionIds.map((optionId) => options.find((option) => option.id === optionId)?.label ?? optionId).join(", ")
      : "No answer";
  }

  if (questionType === "yes_no") {
    return answer.valueBoolean === null ? "No answer" : answer.valueBoolean ? "Yes" : "No";
  }

  if (questionType === "rating") {
    return answer.valueNumber === null ? "No answer" : String(answer.valueNumber);
  }

  if (questionType === "long_text" || questionType === "short_text") {
    return answer.valueText ?? "No answer";
  }

  if (answer.valueTimestamp) {
    return formatDateTime(answer.valueTimestamp) ?? answer.valueTimestamp;
  }

  if (answer.valueDate) {
    return answer.valueDate;
  }

  if (answer.valueJson !== null && answer.valueJson !== undefined) {
    return JSON.stringify(answer.valueJson);
  }

  return "No answer";
};

export const SurveyTrackingResponsePreviewPage = () => {
  const { surveyId = "", responseId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";

  const previewQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getTrackingResponsePreviewRequest(token, surveyId, responseId),
    queryKey: surveyTrackingKeys.responsePreview(surveyId, responseId)
  });

  if (previewQuery.isLoading || !previewQuery.data) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading response preview...</h1>
          <p>The filled survey form is loading.</p>
        </section>
      </div>
    );
  }

  const { answers, definition, response, survey } = previewQuery.data;
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const sections = [...definition.sections].sort((left, right) => left.position - right.position);
  const questions = [...definition.questions].sort((left, right) => left.position - right.position);

  return (
    <div className="survey-preview-shell">
      <Card className="survey-runtime-card">
        <div
          className="survey-runtime-accent"
          style={{ backgroundColor: definition.version.settings.theme?.primaryColor ?? "#184fbe" }}
        />
        <div className="survey-runtime-header">
          <h2>{survey.title ?? definition.version.title}</h2>
          <p>
            Read-only respondent preview. Respondent: {response.respondentEmail ?? "Anonymous public respondent"}.
          </p>
        </div>

        <Card className="survey-runtime-confirmation">
          <div className="survey-runtime-confirmation-meta">
            <span className="survey-runtime-confirmation-label">Response status</span>
            <strong>{response.responseStatus}</strong>
          </div>
          <div className="survey-runtime-confirmation-meta">
            <span className="survey-runtime-confirmation-label">Submitted</span>
            <strong>{response.submittedAt ? formatDateTime(response.submittedAt) ?? response.submittedAt : "Not submitted"}</strong>
          </div>
        </Card>

        {sections.map((section) => (
          <section className="survey-runtime-section" key={section.id}>
            <div className="survey-runtime-section-head">
              <span>Section</span>
              <h3>{section.title}</h3>
              {section.description ? <p>{section.description}</p> : null}
            </div>

            <div className="survey-runtime-question-stack">
              {questions
                .filter((question) => question.sectionId === section.id)
                .map((question) => {
                  const answer = answerMap.get(question.id);
                  const options = definition.options.filter((option) => option.questionId === question.id);

                  return (
                    <div className="survey-runtime-question" key={question.id}>
                      <div className="survey-runtime-question-head">
                        <h4>{question.title}</h4>
                        <span>{question.type.replace(/_/g, " ")}</span>
                      </div>
                      {question.description ? <p>{question.description}</p> : null}
                      <div className="tracking-answer-box">
                        {readAnswerValue(question.type, answer, options)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <div className="survey-form-footer survey-form-footer-centered">
          <Button asChild size="lg" variant="secondary">
            <Link to={`/app/tracking-surveys/${surveyId}/responses`}>Back to responses</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};
