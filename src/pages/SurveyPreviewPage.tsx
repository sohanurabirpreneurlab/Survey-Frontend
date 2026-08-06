import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MonitorSmartphone, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../features/auth/use-auth";
import { getSurveyRequest, getSurveyVersionRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import type { Question, SurveyCalculatedScore, SurveyVersionDefinition } from "../features/surveys/surveys.types";
import { formatDateTime, getQuestionOptions, sortSections } from "../features/surveys/surveys.utils";
import { cn } from "../lib/cn";
import { pageTw, surveyTw } from "../lib/page-tailwind";

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

  if (
    operator === "greater_than" ||
    operator === "greater_than_or_equal" ||
    operator === "less_than" ||
    operator === "less_than_or_equal"
  ) {
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

const evaluateThreshold = (
  scoreValue: number | null,
  operator: SurveyCalculatedScore["thresholdOperator"],
  thresholdValue: number
) => {
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

const readAnswerScore = (
  question: Question,
  value: unknown,
  definition: SurveyVersionDefinition
): number | null => {
  if (question.type === "rating") {
    const normalized =
      typeof value === "number" ? value : typeof value === "string" && value.length > 0 ? Number(value) : null;
    return typeof normalized === "number" && Number.isFinite(normalized) ? normalized : null;
  }

  if (question.type === "single_choice" || question.type === "vote") {
    const optionId = typeof value === "string"
      ? value
      : value && typeof value === "object" && typeof (value as { optionId?: unknown }).optionId === "string"
        ? (value as { optionId: string }).optionId
        : null;
    return optionId ? definition.options.find((option) => option.id === optionId)?.scoreValue ?? null : null;
  }

  return null;
};

const sortQuestionsForPreview = (definition: SurveyVersionDefinition) => {
  const orderedSections = sortSections(definition.sections);
  const sectionPositionById = new Map(
    orderedSections.map((section, index) => [section.id, { index, position: section.position }] as const)
  );

  return [...definition.questions].sort((left, right) => {
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
  });
};

export const SurveyPreviewPage = () => {
  const { surveyId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [previewComplete, setPreviewComplete] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const surveyQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSurveyRequest(token, surveyId),
    queryKey: surveyKeys.detail(surveyId)
  });

  const activeVersionId =
    surveyQuery.data?.currentDraftVersionId ?? surveyQuery.data?.publishedVersionId ?? null;

  const versionQuery = useQuery({
    enabled: Boolean(token && activeVersionId),
    queryFn: () => getSurveyVersionRequest(token, surveyId, activeVersionId as string),
    queryKey: surveyKeys.draft(surveyId, activeVersionId ?? "preview")
  });

  const definition = versionQuery.data;
  const sections = useMemo(() => (definition ? sortSections(definition.sections) : []), [definition]);
  const sortedQuestions = useMemo(() => (definition ? sortQuestionsForPreview(definition) : []), [definition]);
  const questionByStableKey = useMemo(
    () => new Map(sortedQuestions.map((question) => [question.stableKey, question] as const)),
    [sortedQuestions]
  );

  const calculatedScores = useMemo(() => {
    if (!definition) {
      return new Map<string, boolean | null>();
    }

    return new Map(
      definition.calculatedScores.map((score) => {
        const values = score.questions
          .map((source) => {
            const question = sortedQuestions.find((item) => item.id === source.questionId);
            return question ? readAnswerScore(question, answers[question.id], definition) : null;
          })
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

        if (values.length === 0 || values.length !== score.questions.length) {
          return [score.id, null] as const;
        }

        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return [score.id, evaluateThreshold(average, score.thresholdOperator, score.thresholdValue)] as const;
      })
    );
  }, [answers, definition, sortedQuestions]);

  const visibleQuestionIds = useMemo(() => {
    if (!definition) {
      return new Set<string>();
    }

    const targetedQuestionIds = new Set<string>();
    const targetedSectionIds = new Set<string>();
    const matchedQuestionIds = new Set<string>();
    const matchedSectionIds = new Set<string>();

    for (const score of definition.calculatedScores) {
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
  }, [answers, calculatedScores, definition, questionByStableKey, sortedQuestions]);

  const questions = useMemo(
    () => sortedQuestions.filter((question) => visibleQuestionIds.has(question.id)),
    [sortedQuestions, visibleQuestionIds]
  );

  const activeQuestion = questions[currentQuestionIndex] ?? null;
  const activeSection = activeQuestion
    ? sections.find((section) => section.id === activeQuestion.sectionId) ?? null
    : null;
  const options = definition && activeQuestion ? getQuestionOptions(definition, activeQuestion.id) : [];
  const primaryColor = definition?.version.settings.theme.primaryColor ?? "#184fbe";
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 100;
  const answeredCount = questions.filter((question) => {
    const value = answers[question.id];
    if (question.type === "multiple_choice") {
      return Array.isArray(value)
        ? value.length > 0
        : Boolean(value && typeof value === "object" && Array.isArray((value as { optionIds?: unknown }).optionIds) && (value as { optionIds: unknown[] }).optionIds.length > 0);
    }
    if (question.type === "yes_no") {
      return typeof value === "boolean";
    }
    if (question.type === "rating") {
      return typeof value === "number" || (typeof value === "string" && value.trim().length > 0);
    }
    if (question.type === "single_choice" && value && typeof value === "object") {
      return typeof (value as { optionId?: unknown }).optionId === "string";
    }
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  const activeQuestionIdBeforeVisibilityChangeRef = useRef<string | null>(null);

  useEffect(() => {
    if (questions.length === 0) {
      setCurrentQuestionIndex(0);
      return;
    }

    const previousActiveQuestionId = activeQuestionIdBeforeVisibilityChangeRef.current;

    if (!previousActiveQuestionId) {
      setCurrentQuestionIndex((index) => Math.min(index, Math.max(0, questions.length - 1)));
      return;
    }

    const nextIndex = questions.findIndex((question) => question.id === previousActiveQuestionId);

    if (nextIndex >= 0) {
      setCurrentQuestionIndex(nextIndex);
      return;
    }

    setCurrentQuestionIndex((index) => Math.min(index, Math.max(0, questions.length - 1)));
  }, [questions]);

  useEffect(() => {
    activeQuestionIdBeforeVisibilityChangeRef.current = activeQuestion?.id ?? null;
  }, [activeQuestion?.id]);

  const handleNext = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      const firstMissingRequiredIndex = questions.findIndex((question) => {
        if (!question.required) return false;
        const value = answers[question.id];
        if (question.type === "multiple_choice") {
          const optionIds = Array.isArray(value)
            ? value
            : value && typeof value === "object" && Array.isArray((value as { optionIds?: unknown }).optionIds)
              ? (value as { optionIds: string[] }).optionIds
              : [];
          const selectedOther = definition?.options.some((option) => optionIds.includes(option.id) && option.settings.isOther === true) ?? false;
          const otherText = value && typeof value === "object" && typeof (value as { otherText?: unknown }).otherText === "string"
            ? (value as { otherText: string }).otherText.trim()
            : "";
          return optionIds.length === 0 || (selectedOther && otherText.length === 0);
        }
        if (question.type === "single_choice" && value && typeof value === "object") {
          return typeof (value as { optionId?: unknown }).optionId !== "string" || String((value as { otherText?: unknown }).otherText ?? "").trim().length === 0;
        }
        if (question.type === "yes_no") return typeof value !== "boolean";
        if (question.type === "rating") return value === "" || value === null || value === undefined;
        return typeof value !== "string" || value.trim().length === 0;
      });

      if (firstMissingRequiredIndex >= 0) {
        setCurrentQuestionIndex(firstMissingRequiredIndex);
        setPreviewError("Please answer all required questions before finishing the preview.");
        return;
      }

      setPreviewError(null);
      setPreviewComplete(true);
      return;
    }

    setPreviewError(null);
    setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  };

  const restartPreview = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setPreviewComplete(false);
    setPreviewError(null);
  };

  if (surveyQuery.isLoading || versionQuery.isLoading || !surveyQuery.data || !definition) {
    return (
      <div className={pageTw.page}>
        <section className={pageTw.hero}>
          <h1>Loading preview...</h1>
          <p>The selected survey version is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={pageTw.page}>
      <section className={surveyTw.previewHeader}>
        <div>
          <h1>Preview</h1>
          <p>Responses entered here will not be saved.</p>
        </div>
        <div className={surveyTw.actions}>
          <Button asChild size="sm" variant="secondary">
            <Link to={`/app/surveys/${surveyId}/builder`}>Back to builder</Link>
          </Button>
          <div aria-label="Preview mode" className="flex flex-wrap gap-2.5" role="tablist">
            <button
              aria-pressed={mode === "desktop"}
              className={cn(surveyTw.tab, mode === "desktop" && surveyTw.tabActive)}
              onClick={() => setMode("desktop")}
              type="button"
            >
              <MonitorSmartphone size={16} />
              Desktop
            </button>
            <button
              aria-pressed={mode === "mobile"}
              className={cn(surveyTw.tab, mode === "mobile" && surveyTw.tabActive)}
              onClick={() => setMode("mobile")}
              type="button"
            >
              <Smartphone size={16} />
              Mobile
            </button>
          </div>
        </div>
      </section>

      <Card className="p-6 max-app-mobile:p-[18px]">
        <p>
          Preview mode only. This page renders the active{" "}
          {surveyQuery.data.currentDraftVersionId ? "draft" : "published"} version.
        </p>
        <span>
          Opens: {formatDateTime(surveyQuery.data.opensAt) ?? "Immediately"} | Closes:{" "}
          {formatDateTime(surveyQuery.data.closesAt) ?? "No closing date"}
        </span>
        {surveyQuery.data.access.message ? <span>{surveyQuery.data.access.message}</span> : null}
      </Card>

      <div className="flex items-center justify-center px-6 pt-10 pb-14 max-app-mobile:px-4 max-app-mobile:pt-6 max-app-mobile:pb-10">
        <div
          className={cn(
            "relative min-h-[620px] w-full max-w-[960px] overflow-hidden rounded-3xl border border-app-border [border-style:solid] bg-[radial-gradient(circle_at_top_left,rgba(24,79,190,0.1),transparent_34%),linear-gradient(180deg,#fbfdff_0%,#f4f7fb_100%)] shadow-app",
            mode === "mobile" && "max-w-[420px]"
          )}
        >
          {definition.version.settings.showProgressBar ? (
            <div className="absolute inset-x-0 top-0 h-1.5 bg-app-primary-soft">
              <div
                className="h-full transition-[width] duration-300"
                style={{ backgroundColor: primaryColor, width: `${progress}%` }}
              />
            </div>
          ) : null}

          <header className="relative grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 px-7 py-4 max-app-mobile:block max-app-mobile:min-h-[104px] max-app-mobile:px-5 max-app-mobile:py-4">
            {!previewComplete && currentQuestionIndex > 0 ? (
              <button
                aria-label="Previous question"
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-app-border [border-style:solid] bg-white text-app-text-soft shadow-sm transition-colors hover:bg-app-surface-muted"
                onClick={() => {
                  setPreviewError(null);
                  setCurrentQuestionIndex((index) => Math.max(0, index - 1));
                }}
                type="button"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <strong className="min-w-0 truncate text-[0.95rem] max-app-mobile:absolute max-app-mobile:top-[25px] max-app-mobile:left-1/2 max-app-mobile:max-w-[45%] max-app-mobile:-translate-x-1/2 max-app-mobile:text-center">
              {definition.version.title}
            </strong>
            {!previewComplete && questions.length > 0 ? (
              <span className="shrink-0 text-xs font-medium text-app-text-soft max-app-mobile:absolute max-app-mobile:top-[68px] max-app-mobile:left-1/2 max-app-mobile:w-full max-app-mobile:-translate-x-1/2 max-app-mobile:text-center">
                Answered {answeredCount} of {questions.length} / Question {currentQuestionIndex + 1}
              </span>
            ) : null}
          </header>

          {previewComplete ? (
            <section className="grid min-h-[510px] place-content-center justify-items-center gap-5 px-7 pb-14 text-center">
              <CheckCircle2 color={primaryColor} size={56} strokeWidth={1.7} />
              <h2 className="m-0 text-3xl">Preview complete</h2>
              <p className="m-0 max-w-[48ch] text-app-text-soft">
                {definition.version.settings.confirmationMessage}
              </p>
              <Button className="hover:brightness-90" onClick={restartPreview} style={{ backgroundColor: primaryColor }}>
                <RotateCcw size={17} />
                Restart preview
              </Button>
            </section>
          ) : activeQuestion ? (
            <section className="mx-auto flex min-h-[510px] w-full max-w-[720px] items-center px-8 pt-3 pb-16 max-app-mobile:items-start max-app-mobile:px-5 max-app-mobile:pt-14">
              <form
                className="grid w-full gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleNext();
                }}
              >
                <div className="grid gap-3">
                  {activeSection && activeSection.settings.showTitle !== false ? (
                    <span className="text-xs font-semibold" style={{ color: primaryColor }}>
                      {activeSection.title}
                    </span>
                  ) : null}
                  <div className="flex items-start gap-2.5">
                    {definition.version.settings.showQuestionNumbers ? (
                      <span className="mt-1 shrink-0 font-semibold" style={{ color: primaryColor }}>
                        {currentQuestionIndex + 1} /
                      </span>
                    ) : null}
                    <div className="grid gap-2.5">
                      <h2 className="m-0 text-[clamp(1.45rem,3vw,2.25rem)] leading-[1.2] tracking-[-0.02em]">
                        {activeQuestion.title}
                        {activeQuestion.required ? <span style={{ color: primaryColor }}> *</span> : null}
                      </h2>
                      {activeQuestion.description ? (
                        <p className="m-0 leading-7 text-app-text-soft">{activeQuestion.description}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {(activeQuestion.type === "short_text" || activeQuestion.type === "rating") ? (
                    <Input
                      autoFocus
                      className="min-h-14 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 text-lg shadow-none focus:border-app-primary focus:shadow-none"
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [activeQuestion.id]:
                            activeQuestion.type === "rating" ? event.target.value : event.target.value
                        }))
                      }
                      placeholder={activeQuestion.type === "rating" ? "1 to 5" : "Short answer"}
                      type={activeQuestion.type === "rating" ? "number" : "text"}
                      value={typeof answers[activeQuestion.id] === "string" ? (answers[activeQuestion.id] as string) : ""}
                    />
                  ) : null}

                  {activeQuestion.type === "long_text" ? (
                    <textarea
                      autoFocus
                      className="min-h-32 resize-y rounded-xl border border-app-border-strong [border-style:solid] bg-white p-4 text-base text-app-text outline-none focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]"
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))
                      }
                      placeholder="Long answer"
                      value={typeof answers[activeQuestion.id] === "string" ? (answers[activeQuestion.id] as string) : ""}
                    />
                  ) : null}

                  {(activeQuestion.type === "single_choice" ||
                    activeQuestion.type === "vote" ||
                    activeQuestion.type === "multiple_choice") &&
                    options.map((option, index) => {
                      const multiple = activeQuestion.type === "multiple_choice";
                      const rawAnswer = answers[activeQuestion.id];
                      const optionIds = Array.isArray(rawAnswer)
                        ? rawAnswer as string[]
                        : rawAnswer && typeof rawAnswer === "object" && Array.isArray((rawAnswer as { optionIds?: unknown }).optionIds)
                          ? (rawAnswer as { optionIds: string[] }).optionIds
                          : [];
                      const selectedOptionId = typeof rawAnswer === "string"
                        ? rawAnswer
                        : rawAnswer && typeof rawAnswer === "object" && typeof (rawAnswer as { optionId?: unknown }).optionId === "string"
                          ? (rawAnswer as { optionId: string }).optionId
                          : "";
                      const otherText = rawAnswer && typeof rawAnswer === "object" && typeof (rawAnswer as { otherText?: unknown }).otherText === "string"
                        ? (rawAnswer as { otherText: string }).otherText
                        : "";
                      const isOther = activeQuestion.type !== "vote" && option.settings.isOther === true;
                      const selected = multiple ? optionIds.includes(option.id) : selectedOptionId === option.id;

                      return (
                        <div className="grid gap-2" key={option.id}>
                        <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 transition-all hover:border-app-primary hover:bg-app-primary-soft" style={selected ? { backgroundColor: `${primaryColor}12`, borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}20` } : undefined}>
                          <input
                            checked={selected}
                            className="sr-only"
                            name={multiple ? undefined : activeQuestion.id}
                            onChange={(event) =>
                              setAnswers((current) => {
                                if (!multiple) {
                                  return { ...current, [activeQuestion.id]: isOther ? { optionId: option.id, otherText: "" } : option.id };
                                }

                                const values = optionIds;
                                const nextIds = event.target.checked ? [...values, option.id] : values.filter((value) => value !== option.id);

                                return {
                                  ...current,
                                  [activeQuestion.id]: isOther || (rawAnswer && typeof rawAnswer === "object")
                                    ? { optionIds: nextIds, otherText: isOther && !event.target.checked ? "" : otherText }
                                    : nextIds
                                };
                              })
                            }
                            type={multiple ? "checkbox" : "radio"}
                          />
                          <span
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold"
                            style={
                              selected
                                ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" }
                                : undefined
                            }
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-sm font-medium">{option.label}</span>
                          {selected ? <Check size={17} style={{ color: primaryColor }} /> : null}
                        </label>
                        {isOther && selected ? (
                          <Input
                            aria-label={`${option.label} details`}
                            onChange={(event) => setAnswers((current) => ({
                              ...current,
                              [activeQuestion.id]: multiple
                                ? { optionIds, otherText: event.target.value }
                                : { optionId: option.id, otherText: event.target.value }
                            }))}
                            placeholder="Please describe"
                            value={otherText}
                          />
                        ) : null}
                        </div>
                      );
                    })}

                  {activeQuestion.type === "yes_no" &&
                    [
                      { label: "Yes", value: true },
                      { label: "No", value: false }
                    ].map((option, index) => {
                      const selected = answers[activeQuestion.id] === option.value;
                      return (
                        <label
                          className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 hover:border-app-primary hover:bg-app-primary-soft"
                          key={option.label}
                          style={
                            selected ? { backgroundColor: `${primaryColor}12`, borderColor: primaryColor } : undefined
                          }
                        >
                          <input
                            checked={selected}
                            className="sr-only"
                            name={activeQuestion.id}
                            onChange={() =>
                              setAnswers((current) => ({ ...current, [activeQuestion.id]: option.value }))
                            }
                            type="radio"
                          />
                          <span
                            className="inline-flex size-7 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold"
                            style={
                              selected
                                ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" }
                                : undefined
                            }
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="font-medium">{option.label}</span>
                        </label>
                      );
                    })}
                </div>

                {previewError ? (
                  <p className="m-0 text-sm font-semibold text-app-danger" role="alert">
                    {previewError}
                  </p>
                ) : null}

                <div className="flex items-center gap-3">
                  <Button className="hover:brightness-90" style={{ backgroundColor: primaryColor }} type="submit">
                    {currentQuestionIndex === questions.length - 1 ? "Finish preview" : "Next"}
                    {currentQuestionIndex === questions.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />}
                  </Button>
                  <span className="text-xs text-app-text-faint max-app-mobile:hidden">press Enter</span>
                </div>
              </form>
            </section>
          ) : (
            <section className="grid min-h-[510px] place-content-center px-6 text-center">
              <h2>No questions to preview.</h2>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
