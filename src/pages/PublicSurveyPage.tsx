import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ApiError, apiRequest } from "../lib/api";
import { env } from "../lib/env";
import { toast } from "../state/toast-store";
import { formatDateTime } from "../features/surveys/surveys.utils";

type PublicSurveyQuestion = {
  description: string | null;
  displayLogic: {
    conditions?: Array<{
      operator: string;
      questionStableKey: string;
      value: unknown;
    }>;
  };
  id: string;
  position: number;
  required: boolean;
  sectionId: string;
  settings: Record<string, unknown>;
  stableKey: string;
  title: string;
  type: "short_text" | "long_text" | "single_choice" | "multiple_choice" | "yes_no" | "rating" | "vote";
  validation: Record<string, unknown>;
};

type PublicSurvey = {
  calculatedScores: Array<{
    calculationType: "average";
    decimalPlaces: number;
    id: string;
    key: string;
    name: string;
    questions: Array<{
      id: string;
      position: number;
      questionId: string;
      weight: number;
    }>;
    requireAllAnswers: boolean;
    targets: Array<{
      id: string;
      targetId: string;
      targetType: "question" | "section";
    }>;
    thresholdOperator: "less_than" | "less_than_or_equal" | "equal" | "greater_than_or_equal" | "greater_than";
    thresholdValue: number;
  }>;
  description: string | null;
  options: Array<{
    id: string;
    label: string;
    position: number;
    questionId: string;
    scoreValue: number | null;
    stableKey: string;
    value: string;
  }>;
  publicSlug: string;
  questions: PublicSurveyQuestion[];
  sections: Array<{
    description: string | null;
    id: string;
    position: number;
    stableKey: string;
    title: string;
  }>;
  settings: {
    confirmationMessage?: string;
    theme?: {
      primaryColor?: string | null;
    };
  };
  respondentSessionToken?: string;
  title: string;
};

type SurveyResponse = {
  id: string;
  revision: number;
  status: "in_progress" | "submitted";
  submittedAt: string | null;
};

type AccessMode = "public" | "invitation";

const QUESTIONS_PER_PAGE = 10;

const sortByPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((left, right) => left.position - right.position);

const readPlaceholder = (questionType: PublicSurveyQuestion["type"]) => {
  switch (questionType) {
    case "long_text":
      return "Write your answer";
    case "rating":
      return "Enter a rating";
    default:
      return "Type your answer";
  }
};

const normalizeAnswerForSubmit = (question: PublicSurveyQuestion, rawValue: unknown) => {
  if (question.type === "multiple_choice") {
    return Array.isArray(rawValue) ? rawValue : [];
  }

  if (question.type === "yes_no") {
    return typeof rawValue === "boolean" ? rawValue : null;
  }

  if (question.type === "rating") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof rawValue === "string") {
    return rawValue.trim();
  }

  return rawValue ?? null;
};

const hasAnswer = (question: PublicSurveyQuestion, value: unknown) => {
  if (question.type === "multiple_choice") {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === "yes_no") {
    return typeof value === "boolean";
  }

  if (question.type === "rating") {
    return typeof value === "number";
  }

  return typeof value === "string" && value.trim().length > 0;
};

const readAnswerScore = (
  question: PublicSurveyQuestion,
  value: unknown,
  options: PublicSurvey["options"]
): number | null => {
  if (question.type === "rating") {
    const normalized = typeof value === "number" ? value : typeof value === "string" && value.length > 0 ? Number(value) : null;
    return typeof normalized === "number" && Number.isFinite(normalized) ? normalized : null;
  }

  if ((question.type === "single_choice" || question.type === "vote") && typeof value === "string") {
    return options.find((option) => option.id === value)?.scoreValue ?? null;
  }

  return null;
};

const matchesCondition = (answer: unknown, operator: string, expected: unknown) => {
  if (operator === "equals") {
    return Array.isArray(answer) ? answer.includes(expected as string) : answer === expected;
  }

  if (operator === "not_equals") {
    return Array.isArray(answer) ? !answer.includes(expected as string) : answer !== expected;
  }

  if (operator === "contains") {
    if (Array.isArray(answer)) {
      return answer.includes(expected as string);
    }

    if (typeof answer === "string" && typeof expected === "string") {
      return answer.toLowerCase().includes(expected.toLowerCase());
    }
  }

  if (operator === "greater_than" || operator === "greater_than_or_equal" || operator === "less_than" || operator === "less_than_or_equal") {
    const actual = typeof answer === "number" ? answer : Number(answer);
    const target = typeof expected === "number" ? expected : Number(expected);

    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
      return false;
    }

    if (operator === "greater_than") {
      return actual > target;
    }

    if (operator === "greater_than_or_equal") {
      return actual >= target;
    }

    if (operator === "less_than") {
      return actual < target;
    }

    return actual <= target;
  }

  if (operator === "answered") {
    return answer !== null && answer !== undefined && answer !== "" && (!Array.isArray(answer) || answer.length > 0);
  }

  if (operator === "not_answered") {
    return answer === null || answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0);
  }

  return true;
};

const evaluateThreshold = (scoreValue: number | null, operator: PublicSurvey["calculatedScores"][number]["thresholdOperator"], thresholdValue: number) => {
  if (scoreValue === null) {
    return null;
  }

  if (operator === "less_than") {
    return scoreValue < thresholdValue;
  }

  if (operator === "less_than_or_equal") {
    return scoreValue <= thresholdValue;
  }

  if (operator === "equal") {
    return scoreValue === thresholdValue;
  }

  if (operator === "greater_than_or_equal") {
    return scoreValue >= thresholdValue;
  }

  return scoreValue > thresholdValue;
};

const RespondentSurveyRuntime = ({ accessMode }: { accessMode: AccessMode }) => {
  const params = useParams();
  const publicSlug = params.publicSlug;
  const token = params.token;
  const [requestNonce] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const surveyQuery = useQuery({
    enabled: accessMode === "public" ? Boolean(publicSlug) : Boolean(token),
    queryFn: () =>
      apiRequest<PublicSurvey>(
        `${accessMode === "public" ? `/s/${publicSlug}` : `/i/${token}`}?session=${requestNonce}`,
        {
          baseUrl: env.backendBaseUrl,
          cache: "no-store",
          credentials: "include"
        }
      ),
    queryKey: ["respondent", "survey", accessMode, publicSlug ?? token ?? "", requestNonce]
  });

  const responseQuery = useQuery({
    enabled: surveyQuery.isSuccess,
    queryFn: async () => {
      try {
        return await apiRequest<SurveyResponse | null>("/respondent/responses/current", {
          credentials: "include",
          headers: respondentHeaders
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    queryKey: ["respondent", "response", accessMode, publicSlug ?? token ?? ""]
  });

  const prepareResponseMutation = useMutation({
    mutationFn: () =>
      apiRequest<SurveyResponse>("/respondent/responses", {
        credentials: "include",
        headers: respondentHeaders,
        method: "POST"
      })
  });

  const survey = surveyQuery.data as PublicSurvey | undefined;
  const respondentHeaders =
    accessMode === "invitation" && survey?.respondentSessionToken
      ? { "X-Respondent-Session": survey.respondentSessionToken }
      : undefined;
  const sortedSections = useMemo(() => sortByPosition(survey?.sections ?? []), [survey?.sections]);
  const sortedQuestions = useMemo(() => sortByPosition(survey?.questions ?? []), [survey?.questions]);
  const questionByStableKey = useMemo(
    () => new Map(sortedQuestions.map((question) => [question.stableKey, question])),
    [sortedQuestions]
  );

  const calculatedScores = useMemo(() => {
    if (!survey) {
      return new Map<string, boolean | null>();
    }

    return new Map(
      survey.calculatedScores.map((score) => {
        const values = score.questions
          .map((source) => {
            const question = sortedQuestions.find((item) => item.id === source.questionId);
            return question ? readAnswerScore(question, answers[question.id], survey.options) : null;
          })
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

        if (values.length === 0 || (score.requireAllAnswers && values.length !== score.questions.length)) {
          return [score.id, null] as const;
        }

        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return [score.id, evaluateThreshold(average, score.thresholdOperator, score.thresholdValue)] as const;
      })
    );
  }, [answers, sortedQuestions, survey]);

  const visibleQuestionIds = useMemo(() => {
    if (!survey) {
      return new Set<string>();
    }

    const targetedQuestionIds = new Set<string>();
    const targetedSectionIds = new Set<string>();
    const matchedQuestionIds = new Set<string>();
    const matchedSectionIds = new Set<string>();

    for (const score of survey.calculatedScores) {
      for (const target of score.targets) {
        if (target.targetType === "question") {
          targetedQuestionIds.add(target.targetId);
          if (calculatedScores.get(score.id) === true) {
            matchedQuestionIds.add(target.targetId);
          }
        }

        if (target.targetType === "section") {
          targetedSectionIds.add(target.targetId);
          if (calculatedScores.get(score.id) === true) {
            matchedSectionIds.add(target.targetId);
          }
        }
      }
    }

    return new Set(
      sortedQuestions
        .filter((question) => {
          const passesDisplayLogic = (question.displayLogic.conditions ?? []).every((condition) => {
            const sourceQuestion = questionByStableKey.get(condition.questionStableKey);
            return sourceQuestion
              ? matchesCondition(answers[sourceQuestion.id], condition.operator, condition.value)
              : false;
          });

          if (!passesDisplayLogic) {
            return false;
          }

          if (targetedQuestionIds.has(question.id) && !matchedQuestionIds.has(question.id)) {
            return false;
          }

          if (targetedSectionIds.has(question.sectionId) && !matchedSectionIds.has(question.sectionId)) {
            return false;
          }

          return true;
        })
        .map((question) => question.id)
    );
  }, [answers, calculatedScores, questionByStableKey, sortedQuestions, survey]);

  const visibleQuestions = useMemo(
    () => sortedQuestions.filter((question) => visibleQuestionIds.has(question.id)),
    [sortedQuestions, visibleQuestionIds]
  );
  const totalPages = Math.max(1, Math.ceil(visibleQuestions.length / QUESTIONS_PER_PAGE));
  const pagedQuestionIds = useMemo(() => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    const end = start + QUESTIONS_PER_PAGE;
    return new Set(visibleQuestions.slice(start, end).map((question) => question.id));
  }, [currentPage, visibleQuestions]);
  const visibleSections = useMemo(
    () =>
      sortedSections
        .map((section) => ({
          ...section,
          questions: visibleQuestions.filter(
            (question) => question.sectionId === section.id && pagedQuestionIds.has(question.id)
          )
        }))
        .filter((section) => section.questions.length > 0),
    [pagedQuestionIds, sortedSections, visibleQuestions]
  );
  const isLastPage = currentPage === totalPages - 1;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!survey) {
        throw new Error("Survey is not loaded.");
      }

      let response = responseQuery.data as SurveyResponse | null | undefined;

      if (!response) {
        response = await prepareResponseMutation.mutateAsync();
      }

      let revision = response.revision;

      for (const question of visibleQuestions) {
        const normalizedValue = normalizeAnswerForSubmit(question, answers[question.id]);

        if (!hasAnswer(question, normalizedValue)) {
          if (question.required) {
            throw new Error(`Answer required: ${question.title}`);
          }

          continue;
        }

        const updatedResponse = await apiRequest<SurveyResponse>(`/respondent/responses/${response.id}/answers/${question.id}`, {
          body: {
            expectedRevision: revision,
            value: normalizedValue
          },
          credentials: "include",
          headers: respondentHeaders,
          method: "PUT"
        });

        revision = updatedResponse.revision;
      }

      return apiRequest<SurveyResponse>(`/respondent/responses/${response.id}/submit`, {
        credentials: "include",
        headers: {
          ...(respondentHeaders ?? {}),
          "Idempotency-Key": crypto.randomUUID()
        },
        method: "POST"
      });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Please review your answers and try again.";

      toast.danger("Submission failed", message);
    },
    onSuccess: (response) => {
      setSubmittedAt(response.submittedAt ?? new Date().toISOString());
      toast.success("Response submitted", "Thank you for completing the survey.");
    }
  });

  if (surveyQuery.isLoading) {
    return (
      <div className="survey-preview-shell">
        <div className="survey-preview-header">
          <div>
            <h1>Loading survey</h1>
            <p>The public survey is loading.</p>
          </div>
        </div>
      </div>
    );
  }

  if (surveyQuery.isError || !survey) {
    const message =
      surveyQuery.error instanceof ApiError
        ? surveyQuery.error.message
        : "This survey could not be opened from the shared link.";

    return (
      <div className="survey-preview-shell">
        <Card className="survey-preview-banner">
          <h2>Survey unavailable</h2>
          <p>{message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="survey-preview-shell">
      <Card className="survey-runtime-card">
        <div
          className="survey-runtime-accent"
          style={{ backgroundColor: survey.settings.theme?.primaryColor ?? "#184fbe" }}
        />
        <div className="survey-runtime-header">
          <h2>{survey.title}</h2>
          {survey.description ? <p>{survey.description}</p> : null}
        </div>

        {submittedAt ? (
          <Card className="survey-runtime-confirmation">
            <div className="survey-runtime-confirmation-badge">Submission complete</div>
            <div className="survey-runtime-confirmation-copy">
              <h3>Response submitted</h3>
              <p>{survey.settings.confirmationMessage ?? "Your response has been submitted."}</p>
            </div>
            <div className="survey-runtime-confirmation-meta">
              <span className="survey-runtime-confirmation-label">Submitted</span>
              <strong>{formatDateTime(submittedAt)}</strong>
            </div>
          </Card>
        ) : (
          <>
            {visibleSections.map((section) => (
              <section className="survey-runtime-section" key={section.id}>
                <div className="survey-runtime-section-head">
                  <span>Section</span>
                  <h3>{section.title}</h3>
                  {section.description ? <p>{section.description}</p> : null}
                </div>

                <div className="survey-runtime-question-stack">
                  {section.questions.map((question) => {
                    const options = sortByPosition(survey.options.filter((option) => option.questionId === question.id));

                    return (
                      <div className="survey-runtime-question" key={question.id}>
                        <div className="survey-runtime-question-head">
                          <h4>
                            {question.title}
                            {question.required ? <span> *</span> : null}
                          </h4>
                          <span>{question.type.replace(/_/g, " ")}</span>
                        </div>
                        {question.description ? <p>{question.description}</p> : null}

                        {(question.type === "short_text" || question.type === "rating") && (
                          <Input
                            className="survey-runtime-input"
                            inputMode={question.type === "rating" ? "numeric" : undefined}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value
                              }))
                            }
                            placeholder={readPlaceholder(question.type)}
                            type={question.type === "rating" ? "number" : "text"}
                            value={
                              typeof answers[question.id] === "string" || typeof answers[question.id] === "number"
                                ? String(answers[question.id])
                                : ""
                            }
                          />
                        )}

                        {question.type === "long_text" && (
                          <textarea
                            className="textarea survey-runtime-textarea"
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value
                              }))
                            }
                            placeholder={readPlaceholder(question.type)}
                            rows={4}
                            value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                          />
                        )}

                        {(question.type === "single_choice" || question.type === "vote") && (
                          <div className="survey-runtime-options">
                            {options.map((option) => (
                              <label className="survey-runtime-option" key={option.id}>
                                <input
                                  checked={answers[question.id] === option.id}
                                  name={question.id}
                                  onChange={() =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: option.id
                                    }))
                                  }
                                  type="radio"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {question.type === "multiple_choice" && (
                          <div className="survey-runtime-options">
                            {options.map((option) => {
                              const selected = Array.isArray(answers[question.id])
                                ? (answers[question.id] as string[]).includes(option.id)
                                : false;

                              return (
                                <label className="survey-runtime-option" key={option.id}>
                                  <input
                                    checked={selected}
                                    onChange={(event) =>
                                      setAnswers((current) => {
                                        const currentValues = Array.isArray(current[question.id])
                                          ? ([...(current[question.id] as string[])] as string[])
                                          : [];

                                        return {
                                          ...current,
                                          [question.id]: event.target.checked
                                            ? [...currentValues, option.id]
                                            : currentValues.filter((value) => value !== option.id)
                                        };
                                      })
                                    }
                                    type="checkbox"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {question.type === "yes_no" && (
                          <div className="survey-runtime-options">
                            {[
                              { label: "Yes", value: true },
                              { label: "No", value: false }
                            ].map((option) => (
                              <label className="survey-runtime-option" key={option.label}>
                                <input
                                  checked={answers[question.id] === option.value}
                                  name={question.id}
                                  onChange={() =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: option.value
                                    }))
                                  }
                                  type="radio"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="survey-form-footer survey-form-footer-centered">
              {totalPages > 1 && currentPage > 0 ? (
                <Button onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} size="lg" variant="secondary">
                  Previous
                </Button>
              ) : null}

              {!isLastPage ? (
                <Button onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} size="lg">
                  Next
                </Button>
              ) : (
                <Button disabled={submitMutation.isPending || responseQuery.isLoading} onClick={() => void submitMutation.mutateAsync()} size="lg">
                  {submitMutation.isPending ? "Submitting..." : "Submit response"}
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export const PublicSurveyPage = () => <RespondentSurveyRuntime accessMode="public" />;

export const InvitationSurveyPage = () => <RespondentSurveyRuntime accessMode="invitation" />;
