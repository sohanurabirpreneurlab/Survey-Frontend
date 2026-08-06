import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ApiError, apiRequest } from "../lib/api";
import { env } from "../lib/env";
import { toast } from "../state/toast-store";
import { formatDateTime } from "../features/surveys/surveys.utils";
import { publicSurveyTw, surveyTw } from "../lib/page-tailwind";

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
    settings: Record<string, unknown>;
    stableKey: string;
    value: string;
  }>;
  publicSlug: string;
  questions: PublicSurveyQuestion[];
  sections: Array<{
    description: string | null;
    id: string;
    position: number;
    settings: Record<string, unknown>;
    stableKey: string;
    title: string;
  }>;
  settings: {
    confirmationMessage?: string;
    showProgressBar?: boolean;
    showQuestionNumbers?: boolean;
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

type PersistedSurveyState = {
  answers: Record<string, unknown>;
  currentPage: number;
};

const respondentStateStorageKey = (accessMode: AccessMode, identifier: string) =>
  `survey-respondent-state:${accessMode}:${identifier}`;

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
    if (Array.isArray(rawValue)) {
      return rawValue;
    }

    if (rawValue && typeof rawValue === "object" && Array.isArray((rawValue as { optionIds?: unknown }).optionIds)) {
      return {
        optionIds: (rawValue as { optionIds: unknown[] }).optionIds.map(String),
        otherText: typeof (rawValue as { otherText?: unknown }).otherText === "string"
          ? (rawValue as { otherText: string }).otherText.trim()
          : ""
      };
    }

    return [];
  }

  if (question.type === "single_choice" && rawValue && typeof rawValue === "object") {
    return {
      optionId: typeof (rawValue as { optionId?: unknown }).optionId === "string"
        ? (rawValue as { optionId: string }).optionId
        : "",
      otherText: typeof (rawValue as { otherText?: unknown }).otherText === "string"
        ? (rawValue as { otherText: string }).otherText.trim()
        : ""
    };
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
    return Array.isArray(value)
      ? value.length > 0
      : Boolean(value && typeof value === "object" && Array.isArray((value as { optionIds?: unknown }).optionIds) && (value as { optionIds: unknown[] }).optionIds.length > 0);
  }

  if (question.type === "yes_no") {
    return typeof value === "boolean";
  }

  if (question.type === "single_choice" && value && typeof value === "object") {
    return typeof (value as { optionId?: unknown }).optionId === "string" && (value as { optionId: string }).optionId.length > 0;
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

  if (question.type === "single_choice" || question.type === "vote") {
    const optionId = typeof value === "string"
      ? value
      : value && typeof value === "object" && typeof (value as { optionId?: unknown }).optionId === "string"
        ? (value as { optionId: string }).optionId
        : null;
    return optionId ? options.find((option) => option.id === optionId)?.scoreValue ?? null : null;
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
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const storageIdentifier = accessMode === "public" ? publicSlug ?? "" : token ?? "";
  const storageKey = storageIdentifier ? respondentStateStorageKey(accessMode, storageIdentifier) : null;

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

  const survey = surveyQuery.data as PublicSurvey | undefined;
  const respondentHeaders =
    survey?.respondentSessionToken
      ? { "X-Respondent-Session": survey.respondentSessionToken }
      : undefined;
  const sortedSections = useMemo(() => sortByPosition(survey?.sections ?? []), [survey?.sections]);
  const sectionPositionById = useMemo(
    () => new Map(sortedSections.map((section, index) => [section.id, { index, position: section.position }])),
    [sortedSections]
  );
  const sortedQuestions = useMemo(
    () =>
      [...(survey?.questions ?? [])].sort((left, right) => {
        const leftSection = sectionPositionById.get(left.sectionId);
        const rightSection = sectionPositionById.get(right.sectionId);
        const sectionPositionDelta = (leftSection?.position ?? 0) - (rightSection?.position ?? 0);

        if (sectionPositionDelta !== 0) {
          return sectionPositionDelta;
        }

        const sectionIndexDelta = (leftSection?.index ?? 0) - (rightSection?.index ?? 0);

        if (sectionIndexDelta !== 0) {
          return sectionIndexDelta;
        }

        return left.position - right.position;
      }),
    [sectionPositionById, survey?.questions]
  );
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

        if (values.length === 0 || values.length !== score.questions.length) {
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
  const totalPages = Math.max(1, visibleQuestions.length);
  const activeQuestion = visibleQuestions[currentPage] ?? null;
  const activeSection = activeQuestion
    ? sortedSections.find((section) => section.id === activeQuestion.sectionId) ?? null
    : null;
  const isLastPage = currentPage === totalPages - 1;
  const activeQuestionIdBeforeVisibilityChangeRef = useRef<string | null>(null);
  const hasLoadedVisibleQuestions = Boolean(survey) && visibleQuestions.length > 0;

  useEffect(() => {
    if (!hasLoadedVisibleQuestions) {
      return;
    }

    const previousActiveQuestionId = activeQuestionIdBeforeVisibilityChangeRef.current;

    if (!previousActiveQuestionId) {
      setCurrentPage((page) => Math.min(page, Math.max(0, totalPages - 1)));
      return;
    }

    const nextIndex = visibleQuestions.findIndex((question) => question.id === previousActiveQuestionId);

    if (nextIndex >= 0) {
      setCurrentPage(nextIndex);
      return;
    }

    setCurrentPage((page) => Math.min(page, Math.max(0, totalPages - 1)));
  }, [hasLoadedVisibleQuestions, totalPages, visibleQuestions]);

  useEffect(() => {
    activeQuestionIdBeforeVisibilityChangeRef.current = activeQuestion?.id ?? null;
  }, [activeQuestion?.id]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setHydratedStorageKey(storageKey);
      return;
    }

    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      setHydratedStorageKey(storageKey);
      return;
    }

    try {
      const persistedState = JSON.parse(rawValue) as PersistedSurveyState;
      setAnswers(
        persistedState.answers && typeof persistedState.answers === "object" && !Array.isArray(persistedState.answers)
          ? persistedState.answers
          : {}
      );
      setCurrentPage(
        Number.isInteger(persistedState.currentPage) && persistedState.currentPage >= 0
          ? persistedState.currentPage
          : 0
      );
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydratedStorageKey(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined" || submittedAt || hydratedStorageKey !== storageKey) {
      return;
    }

    const persistedState: PersistedSurveyState = {
      answers,
      currentPage
    };

    window.localStorage.setItem(storageKey, JSON.stringify(persistedState));
  }, [answers, currentPage, hydratedStorageKey, storageKey, submittedAt]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!survey) {
        throw new Error("Survey is not loaded.");
      }

      return apiRequest<SurveyResponse>("/respondent/responses/submit", {
        body: {
          answers: visibleQuestions.flatMap((question) => {
            const normalizedValue = normalizeAnswerForSubmit(question, answers[question.id]);

            if (!hasAnswer(question, normalizedValue)) {
              if (question.required) {
                throw new Error(`Answer required: ${question.title}`);
              }

              return [];
            }

            return [
              {
                questionId: question.id,
                value: normalizedValue
              }
            ];
          })
        },
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
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      setSubmittedAt(response.submittedAt ?? new Date().toISOString());
      toast.success("Response submitted", "Thank you for completing the survey.");
    }
  });

  const handleContinue = () => {
    if (!activeQuestion) {
      if (isLastPage) {
        void submitMutation.mutateAsync();
      }
      return;
    }

    setNavigationError(null);
    if (isLastPage) {
      const firstMissingRequiredIndex = visibleQuestions.findIndex((question) =>
        question.required && !hasAnswer(question, normalizeAnswerForSubmit(question, answers[question.id]))
      );

      if (firstMissingRequiredIndex >= 0) {
        setCurrentPage(firstMissingRequiredIndex);
        setNavigationError("This required question must be answered before you can submit.");
        toast.danger("Required answer missing", "Please answer all required questions before submitting.");
        return;
      }

      void submitMutation.mutateAsync();
      return;
    }

    setCurrentPage((page) => Math.min(totalPages - 1, page + 1));
  };

  const handlePrevious = () => {
    setNavigationError(null);
    setCurrentPage((page) => Math.max(0, page - 1));
  };

  if (surveyQuery.isLoading) {
    return (
      <div className={publicSurveyTw.shell}>
        <div className={surveyTw.previewHeader}>
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
      <div className={publicSurveyTw.shell}>
        <Card className="p-6 max-app-mobile:p-[18px]">
          <h2>Survey unavailable</h2>
          <p>{message}</p>
        </Card>
      </div>
    );
  }

  const primaryColor = survey.settings.theme?.primaryColor ?? "#184fbe";
  const options = activeQuestion
    ? sortByPosition(survey.options.filter((option) => option.questionId === activeQuestion.id))
    : [];
  const progress = visibleQuestions.length > 0 ? ((currentPage + 1) / visibleQuestions.length) * 100 : 100;
  const answeredCount = visibleQuestions.filter((question) =>
    hasAnswer(question, normalizeAnswerForSubmit(question, answers[question.id]))
  ).length;
  const choiceClassName =
    "group flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 text-left text-app-text transition-all hover:border-app-primary hover:bg-app-primary-soft has-[:checked]:border-app-primary has-[:checked]:bg-app-primary-soft has-[:checked]:shadow-[0_0_0_2px_rgba(24,79,190,0.12)]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(24,79,190,0.1),transparent_34%),linear-gradient(180deg,#fbfdff_0%,#f4f7fb_100%)]">
      {survey.settings.showProgressBar !== false && !submittedAt ? (
        <div className="fixed inset-x-0 top-0 z-20 h-1.5 bg-app-primary-soft">
          <div className="h-full transition-[width] duration-300" style={{ backgroundColor: primaryColor, width: `${progress}%` }} />
        </div>
      ) : null}

        <header className="relative grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 px-7 py-4 max-app-mobile:block max-app-mobile:min-h-[104px] max-app-mobile:px-5 max-app-mobile:py-4">
          {!submittedAt && currentPage > 0 ? (
            <button aria-label="Previous question" className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-app-border [border-style:solid] bg-white text-app-text-soft shadow-sm transition-colors hover:bg-app-surface-muted" onClick={handlePrevious} type="button">
              <ArrowLeft size={18} />
            </button>
          ) : <span aria-hidden="true" />}
        <strong className="min-w-0 truncate text-[0.95rem] max-app-mobile:absolute max-app-mobile:top-[25px] max-app-mobile:left-1/2 max-app-mobile:max-w-[45%] max-app-mobile:-translate-x-1/2 max-app-mobile:text-center">{survey.title}</strong>
        {!submittedAt && visibleQuestions.length > 0 ? (
          <span className="text-right text-sm font-medium text-app-text-soft max-app-mobile:absolute max-app-mobile:top-[68px] max-app-mobile:left-1/2 max-app-mobile:w-full max-app-mobile:-translate-x-1/2 max-app-mobile:text-center max-app-mobile:text-xs">Answered {answeredCount} of {visibleQuestions.length} · Question {currentPage + 1}</span>
        ) : null}
      </header>

      {submittedAt ? (
        <section className="mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[720px] items-center px-6 pb-20">
          <div className="grid w-full justify-items-center gap-5 text-center">
            <CheckCircle2 color={primaryColor} size={64} strokeWidth={1.7} />
            <span className="text-sm font-bold tracking-[0.08em] text-app-success uppercase">Submission complete</span>
            <h1 className="m-0 text-[clamp(2rem,5vw,3.5rem)] leading-[1.12]">Thank you!</h1>
            <p className="m-0 max-w-[56ch] text-lg leading-8 text-app-text-soft">
              {survey.settings.confirmationMessage ?? "Your response has been submitted."}
            </p>
            <span className="text-sm text-app-text-faint">Submitted {formatDateTime(submittedAt)}</span>
          </div>
        </section>
      ) : activeQuestion ? (
        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-[720px] items-center px-8 pt-3 pb-16 max-app-mobile:items-start max-app-mobile:px-5 max-app-mobile:pt-14">
          <form
            className="grid w-full gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleContinue();
            }}
          >
            <div className="grid gap-3">
              {activeSection && activeSection.settings.showTitle !== false ? (
                <span className="text-xs font-semibold" style={{ color: primaryColor }}>{activeSection.title}</span>
              ) : null}
              <div className="flex items-start gap-3">
                {survey.settings.showQuestionNumbers !== false ? (
                  <span className="mt-1 shrink-0 font-semibold" style={{ color: primaryColor }}>{currentPage + 1} →</span>
                ) : null}
                <div className="grid gap-3">
                  <h1 className="m-0 text-[clamp(1.45rem,3vw,2.25rem)] leading-[1.2] font-semibold tracking-[-0.02em]">
                    {activeQuestion.title}{activeQuestion.required ? <span style={{ color: primaryColor }}> *</span> : null}
                  </h1>
                  {activeQuestion.description ? <p className="m-0 leading-7 text-app-text-soft">{activeQuestion.description}</p> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {(activeQuestion.type === "short_text" || activeQuestion.type === "rating") ? (
                <Input
                  autoFocus
                  className="min-h-14 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 text-lg shadow-none focus:border-app-primary focus:shadow-none"
                  inputMode={activeQuestion.type === "rating" ? "numeric" : undefined}
                  onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))}
                  placeholder={readPlaceholder(activeQuestion.type)}
                  type={activeQuestion.type === "rating" ? "number" : "text"}
                  value={typeof answers[activeQuestion.id] === "string" || typeof answers[activeQuestion.id] === "number" ? String(answers[activeQuestion.id]) : ""}
                />
              ) : null}

              {activeQuestion.type === "long_text" ? (
                <textarea
                  autoFocus
                  className="min-h-32 resize-y rounded-xl border border-app-border-strong [border-style:solid] bg-white p-4 text-base text-app-text outline-none transition-shadow focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]"
                  onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))}
                  placeholder={readPlaceholder(activeQuestion.type)}
                  value={typeof answers[activeQuestion.id] === "string" ? answers[activeQuestion.id] as string : ""}
                />
              ) : null}

              {(activeQuestion.type === "single_choice" || activeQuestion.type === "vote") ? options.map((option, index) => {
                const rawAnswer = answers[activeQuestion.id];
                const selectedOptionId = typeof rawAnswer === "string"
                  ? rawAnswer
                  : rawAnswer && typeof rawAnswer === "object" && typeof (rawAnswer as { optionId?: unknown }).optionId === "string"
                    ? (rawAnswer as { optionId: string }).optionId
                    : "";
                const otherText = rawAnswer && typeof rawAnswer === "object" && typeof (rawAnswer as { otherText?: unknown }).otherText === "string"
                  ? (rawAnswer as { otherText: string }).otherText
                  : "";
                const isOther = activeQuestion.type === "single_choice" && option.settings.isOther === true;
                const selected = selectedOptionId === option.id;

                return (
                  <div className="grid gap-2" key={option.id}>
                    <label className={choiceClassName}>
                      <input className="sr-only" checked={selected} name={activeQuestion.id} onChange={() => setAnswers((current) => ({
                        ...current,
                        [activeQuestion.id]: isOther ? { optionId: option.id, otherText: "" } : option.id
                      }))} type="radio" />
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold group-has-[:checked]:border-app-primary group-has-[:checked]:text-white" style={selected ? { backgroundColor: primaryColor } : undefined}>{String.fromCharCode(65 + index)}</span>
                      <span className="flex-1 font-medium">{option.label}</span>
                      {selected ? <Check size={17} style={{ color: primaryColor }} /> : null}
                    </label>
                    {isOther && selected ? (
                      <Input
                        aria-label={`${option.label} details`}
                        onChange={(event) => setAnswers((current) => ({
                          ...current,
                          [activeQuestion.id]: { optionId: option.id, otherText: event.target.value }
                        }))}
                        placeholder="Please describe"
                        required
                        value={otherText}
                      />
                    ) : null}
                  </div>
                );
              }) : null}

              {activeQuestion.type === "multiple_choice" ? options.map((option, index) => {
                const rawAnswer = answers[activeQuestion.id];
                const selectedIds = Array.isArray(rawAnswer)
                  ? rawAnswer as string[]
                  : rawAnswer && typeof rawAnswer === "object" && Array.isArray((rawAnswer as { optionIds?: unknown }).optionIds)
                    ? (rawAnswer as { optionIds: string[] }).optionIds
                    : [];
                const otherText = rawAnswer && typeof rawAnswer === "object" && typeof (rawAnswer as { otherText?: unknown }).otherText === "string"
                  ? (rawAnswer as { otherText: string }).otherText
                  : "";
                const isOther = option.settings.isOther === true;
                const selected = selectedIds.includes(option.id);
                return (
                  <div className="grid gap-2" key={option.id}>
                    <label className={choiceClassName}>
                      <input className="sr-only" checked={selected} onChange={(event) => setAnswers((current) => {
                        const nextIds = event.target.checked ? [...selectedIds, option.id] : selectedIds.filter((value) => value !== option.id);
                        return {
                          ...current,
                          [activeQuestion.id]: isOther || (rawAnswer && typeof rawAnswer === "object")
                            ? { optionIds: nextIds, otherText: isOther && !event.target.checked ? "" : otherText }
                            : nextIds
                        };
                      })} type="checkbox" />
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold" style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : undefined}>{String.fromCharCode(65 + index)}</span>
                      <span className="flex-1 font-medium">{option.label}</span>
                      {selected ? <Check size={17} style={{ color: primaryColor }} /> : null}
                    </label>
                    {isOther && selected ? (
                      <Input
                        aria-label={`${option.label} details`}
                        onChange={(event) => setAnswers((current) => ({
                          ...current,
                          [activeQuestion.id]: { optionIds: selectedIds, otherText: event.target.value }
                        }))}
                        placeholder="Please describe"
                        required
                        value={otherText}
                      />
                    ) : null}
                  </div>
                );
              }) : null}

              {activeQuestion.type === "yes_no" ? [{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => (
                <label className={choiceClassName} key={option.label}>
                  <input className="sr-only" checked={answers[activeQuestion.id] === option.value} name={activeQuestion.id} onChange={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: option.value }))} type="radio" />
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold" style={answers[activeQuestion.id] === option.value ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : undefined}>{String.fromCharCode(65 + index)}</span>
                  <span className="flex-1 font-medium">{option.label}</span>
                </label>
              )) : null}
            </div>

            {navigationError ? <p className="m-0 text-sm font-semibold text-app-danger" role="alert">{navigationError}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              {currentPage > 0 ? (
                <Button onClick={handlePrevious} type="button" variant="secondary">
                  <ArrowLeft size={18} />
                  Previous
                </Button>
              ) : null}
              <Button className="hover:brightness-90" disabled={submitMutation.isPending} style={{ backgroundColor: primaryColor }} type="submit">
                {isLastPage ? (submitMutation.isPending ? "Submitting..." : "Submit") : "Next"}
                {isLastPage ? <Check size={18} /> : <ArrowRight size={18} />}
              </Button>
              <span className="text-sm text-app-text-faint max-app-mobile:hidden">press Enter ↵</span>
            </div>
          </form>
        </section>
      ) : (
        <section className="mx-auto grid min-h-[calc(100vh-92px)] max-w-[680px] place-content-center gap-5 px-6 text-center">
          <h1>This survey has no questions.</h1>
        </section>
      )}

    </main>
  );
};

export const PublicSurveyPage = () => <RespondentSurveyRuntime accessMode="public" />;

export const InvitationSurveyPage = () => <RespondentSurveyRuntime accessMode="invitation" />;
