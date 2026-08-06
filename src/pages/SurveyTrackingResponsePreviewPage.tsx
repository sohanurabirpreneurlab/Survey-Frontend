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
    const optionId = answer.optionIds[0];
    if (!optionId) {
      return "No answer";
    }

    const label = options.find((option) => option.id === optionId)?.label ?? optionId;
    const otherText = answer.valueJson && typeof answer.valueJson === "object" && typeof (answer.valueJson as { otherText?: unknown }).otherText === "string"
      ? (answer.valueJson as { otherText: string }).otherText
      : "";
    return otherText ? `${label} — ${otherText}` : label;
  }

  if (questionType === "multiple_choice") {
    if (answer.optionIds.length === 0) {
      return "No answer";
    }

    const labels = answer.optionIds.map((optionId) => options.find((option) => option.id === optionId)?.label ?? optionId);
    const otherText = answer.valueJson && typeof answer.valueJson === "object" && typeof (answer.valueJson as { otherText?: unknown }).otherText === "string"
      ? (answer.valueJson as { otherText: string }).otherText
      : "";
    return otherText ? `${labels.join(", ")} — ${otherText}` : labels.join(", ");
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
      <div className="grid gap-6">
        <section className="rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:p-[22px]">
          <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Loading response preview...</h1>
          <p className="m-0 text-app-text-soft">The filled survey form is loading.</p>
        </section>
      </div>
    );
  }

  const { answers, definition, response, survey } = previewQuery.data;
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const sections = [...definition.sections].sort((left, right) => left.position - right.position);
  const questions = [...definition.questions].sort((left, right) => left.position - right.position);

  return (
    <div className="flex items-center justify-center px-6 pt-10 pb-14 max-app-mobile:px-4 max-app-mobile:pt-6 max-app-mobile:pb-10">
      <Card className="grid w-full max-w-[840px] gap-[22px] overflow-hidden pb-6">
        <div
          className="h-3 w-full"
          style={{ backgroundColor: definition.version.settings.theme?.primaryColor ?? "#184fbe" }}
        />
        <div className="mx-6 grid gap-3.5 pt-2 max-app-mobile:mx-[18px]">
          <h2 className="m-0 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.15]">{survey.title ?? definition.version.title}</h2>
          <p className="m-0 text-app-text-soft">
            Read-only respondent preview. Respondent: {response.respondentEmail ?? "Anonymous public respondent"}.
          </p>
        </div>

        <Card className="mx-6 grid grid-cols-2 gap-[18px] rounded-app-md border border-app-border [border-style:solid] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.98))] p-7 max-app-mobile:mx-[18px] max-app-mobile:grid-cols-1 max-app-mobile:p-[18px]">
          <div className="grid items-start gap-1.5 rounded-[18px] border border-[rgba(24,79,190,0.1)] [border-style:solid] bg-[rgba(24,79,190,0.05)] px-[18px] py-4">
            <span className="text-[0.8rem] font-bold tracking-[0.08em] text-app-text-soft uppercase">Response status</span>
            <strong>{response.responseStatus}</strong>
          </div>
          <div className="grid items-start gap-1.5 rounded-[18px] border border-[rgba(24,79,190,0.1)] [border-style:solid] bg-[rgba(24,79,190,0.05)] px-[18px] py-4">
            <span className="text-[0.8rem] font-bold tracking-[0.08em] text-app-text-soft uppercase">Submitted</span>
            <strong>{response.submittedAt ? formatDateTime(response.submittedAt) ?? response.submittedAt : "Not submitted"}</strong>
          </div>
        </Card>

        {sections.map((section) => (
          <section className="mx-6 grid gap-4 rounded-app-md border border-app-border [border-style:solid] bg-white/[0.94] p-5 max-app-mobile:mx-[18px] max-app-mobile:p-[18px]" key={section.id}>
            <div className="grid gap-1.5">
              <span className="text-[0.82rem] font-bold text-app-primary uppercase">Section</span>
              <h3 className="m-0">{section.title}</h3>
              {section.description ? <p className="m-0 text-app-text-soft">{section.description}</p> : null}
            </div>

            <div className="grid gap-4">
              {questions
                .filter((question) => question.sectionId === section.id)
                .map((question) => {
                  const answer = answerMap.get(question.id);
                  const options = definition.options.filter((option) => option.questionId === question.id);

                  return (
                    <div className="grid gap-3 rounded-app-md border border-app-border [border-style:solid] bg-white/[0.94] p-[18px]" key={question.id}>
                      <div className="flex items-center justify-between">
                        <h4 className="m-0">{question.title}</h4>
                        <span className="text-xs font-semibold text-app-text-faint capitalize">{question.type.replace(/_/g, " ")}</span>
                      </div>
                      {question.description ? <p className="m-0 text-app-text-soft">{question.description}</p> : null}
                      <div className="whitespace-pre-wrap rounded-2xl border border-[rgba(24,79,190,0.1)] [border-style:solid] bg-[rgba(24,79,190,0.05)] px-4 py-3.5 leading-7 text-app-text">
                        {readAnswerValue(question.type, answer, options)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to={`/app/tracking-surveys/${surveyId}/responses`}>Back to responses</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};
