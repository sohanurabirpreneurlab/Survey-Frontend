import { ArrowLeft, ArrowRight, Check, CheckCircle2, MonitorSmartphone, RotateCcw, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../features/auth/use-auth";
import { getSurveyRequest, getSurveyVersionRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import {
  formatDateTime,
  getQuestionOptions,
  readQuestionPlaceholder,
  sortQuestions,
  sortSections
} from "../features/surveys/surveys.utils";
import { cn } from "../lib/cn";
import { pageTw, surveyTw } from "../lib/page-tailwind";

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
  const questions = useMemo(() => (definition ? sortQuestions(definition.questions) : []), [definition]);
  const activeQuestion = questions[currentQuestionIndex] ?? null;
  const activeSection = activeQuestion
    ? sections.find((section) => section.id === activeQuestion.sectionId) ?? null
    : null;
  const options = definition && activeQuestion ? getQuestionOptions(definition, activeQuestion.id) : [];
  const primaryColor = definition?.version.settings.theme.primaryColor ?? "#184fbe";
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 100;
  const answeredCount = questions.filter((question) => {
    const value = answers[question.id];
    return question.type === "multiple_choice"
      ? Array.isArray(value) && value.length > 0
      : question.type === "yes_no"
        ? typeof value === "boolean"
        : typeof value === "string" && value.trim().length > 0;
  }).length;

  const handleNext = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      const firstMissingRequiredIndex = questions.findIndex((question) => {
        if (!question.required) return false;
        const value = answers[question.id];
        if (question.type === "multiple_choice") return !Array.isArray(value) || value.length === 0;
        if (question.type === "yes_no") return typeof value !== "boolean";
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
          <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Preview mode">
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
          Preview mode only. This page renders the active {surveyQuery.data.currentDraftVersionId ? "draft" : "published"} version.
        </p>
        <span>
          Opens: {formatDateTime(surveyQuery.data.opensAt) ?? "Immediately"} | Closes:{" "}
          {formatDateTime(surveyQuery.data.closesAt) ?? "No closing date"}
        </span>
        {surveyQuery.data.access.message ? <span>{surveyQuery.data.access.message}</span> : null}
      </Card>

      <div className="flex items-center justify-center px-6 pt-10 pb-14 max-app-mobile:px-4 max-app-mobile:pt-6 max-app-mobile:pb-10">
        <div className={cn("relative min-h-[620px] w-full max-w-[960px] overflow-hidden rounded-3xl border border-app-border [border-style:solid] bg-[radial-gradient(circle_at_top_left,rgba(24,79,190,0.1),transparent_34%),linear-gradient(180deg,#fbfdff_0%,#f4f7fb_100%)] shadow-app", mode === "mobile" && "max-w-[420px]")}>
          {definition.version.settings.showProgressBar ? (
            <div className="absolute inset-x-0 top-0 h-1.5 bg-app-primary-soft">
              <div className="h-full transition-[width] duration-300" style={{ backgroundColor: primaryColor, width: `${progress}%` }} />
            </div>
          ) : null}

          <header className="flex items-center justify-between gap-4 px-7 py-6 max-app-mobile:px-5">
            <strong className="truncate text-sm">{definition.version.title}</strong>
            {!previewComplete && questions.length > 0 ? <span className="shrink-0 text-xs font-medium text-app-text-soft">Answered {answeredCount} of {questions.length} · Question {currentQuestionIndex + 1}</span> : null}
          </header>

          {previewComplete ? (
            <section className="grid min-h-[510px] place-content-center justify-items-center gap-5 px-7 pb-14 text-center">
              <CheckCircle2 color={primaryColor} size={56} strokeWidth={1.7} />
              <h2 className="m-0 text-3xl">Preview complete</h2>
              <p className="m-0 max-w-[48ch] text-app-text-soft">{definition.version.settings.confirmationMessage}</p>
              <Button className="hover:brightness-90" onClick={restartPreview} style={{ backgroundColor: primaryColor }}>
                <RotateCcw size={17} />
                Restart preview
              </Button>
            </section>
          ) : activeQuestion ? (
            <section className="mx-auto flex min-h-[510px] w-full max-w-[720px] items-center px-8 pt-3 pb-16 max-app-mobile:items-start max-app-mobile:px-5 max-app-mobile:pt-14">
              <form className="grid w-full gap-6" onSubmit={(event) => { event.preventDefault(); handleNext(); }}>
                <div className="grid gap-3">
                  {activeSection ? <span className="text-xs font-semibold" style={{ color: primaryColor }}>{activeSection.title}</span> : null}
                  <div className="flex items-start gap-2.5">
                    {definition.version.settings.showQuestionNumbers ? <span className="mt-1 shrink-0 font-semibold" style={{ color: primaryColor }}>{currentQuestionIndex + 1} →</span> : null}
                    <div className="grid gap-2.5">
                      <h2 className="m-0 text-[clamp(1.45rem,3vw,2.25rem)] leading-[1.2] tracking-[-0.02em]">{activeQuestion.title}{activeQuestion.required ? <span style={{ color: primaryColor }}> *</span> : null}</h2>
                      {activeQuestion.description ? <p className="m-0 leading-7 text-app-text-soft">{activeQuestion.description}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {(activeQuestion.type === "short_text" || activeQuestion.type === "rating") ? (
                    <Input autoFocus className="min-h-14 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 text-lg shadow-none focus:border-app-primary focus:shadow-none" onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))} placeholder={readQuestionPlaceholder(activeQuestion.type)} type={activeQuestion.type === "rating" ? "number" : "text"} value={typeof answers[activeQuestion.id] === "string" ? answers[activeQuestion.id] as string : ""} />
                  ) : null}

                  {activeQuestion.type === "long_text" ? (
                    <textarea autoFocus className="min-h-32 resize-y rounded-xl border border-app-border-strong [border-style:solid] bg-white p-4 text-base text-app-text outline-none focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]" onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))} placeholder={readQuestionPlaceholder(activeQuestion.type)} value={typeof answers[activeQuestion.id] === "string" ? answers[activeQuestion.id] as string : ""} />
                  ) : null}

                  {(activeQuestion.type === "single_choice" || activeQuestion.type === "vote" || activeQuestion.type === "multiple_choice") ? options.map((option, index) => {
                    const multiple = activeQuestion.type === "multiple_choice";
                    const selected = multiple ? Array.isArray(answers[activeQuestion.id]) && (answers[activeQuestion.id] as string[]).includes(option.id) : answers[activeQuestion.id] === option.id;
                    return (
                      <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 transition-all hover:border-app-primary hover:bg-app-primary-soft" key={option.id} style={selected ? { backgroundColor: `${primaryColor}12`, borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}20` } : undefined}>
                        <input className="sr-only" checked={selected} name={multiple ? undefined : activeQuestion.id} onChange={(event) => setAnswers((current) => {
                          if (!multiple) return { ...current, [activeQuestion.id]: option.id };
                          const values = Array.isArray(current[activeQuestion.id]) ? current[activeQuestion.id] as string[] : [];
                          return { ...current, [activeQuestion.id]: event.target.checked ? [...values, option.id] : values.filter((value) => value !== option.id) };
                        })} type={multiple ? "checkbox" : "radio"} />
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold" style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : undefined}>{String.fromCharCode(65 + index)}</span>
                        <span className="flex-1 text-sm font-medium">{option.label}</span>
                        {selected ? <Check size={17} style={{ color: primaryColor }} /> : null}
                      </label>
                    );
                  }) : null}

                  {activeQuestion.type === "yes_no" ? [{ label: "Yes", value: true }, { label: "No", value: false }].map((option, index) => {
                    const selected = answers[activeQuestion.id] === option.value;
                    return (
                      <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 hover:border-app-primary hover:bg-app-primary-soft" key={option.label} style={selected ? { backgroundColor: `${primaryColor}12`, borderColor: primaryColor } : undefined}>
                        <input className="sr-only" checked={selected} name={activeQuestion.id} onChange={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: option.value }))} type="radio" />
                        <span className="inline-flex size-7 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold" style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : undefined}>{String.fromCharCode(65 + index)}</span>
                        <span className="font-medium">{option.label}</span>
                      </label>
                    );
                  }) : null}
                </div>

                {previewError ? <p className="m-0 text-sm font-semibold text-app-danger" role="alert">{previewError}</p> : null}

                <div className="flex items-center gap-3">
                  <Button className="hover:brightness-90" style={{ backgroundColor: primaryColor }} type="submit">
                    {currentQuestionIndex === questions.length - 1 ? "Finish preview" : "Next"}
                    {currentQuestionIndex === questions.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />}
                  </Button>
                  <span className="text-xs text-app-text-faint max-app-mobile:hidden">press Enter ↵</span>
                </div>
              </form>
            </section>
          ) : (
            <section className="grid min-h-[510px] place-content-center px-6 text-center"><h2>No questions to preview.</h2></section>
          )}

          {!previewComplete && currentQuestionIndex > 0 ? (
            <button aria-label="Previous question" className="absolute bottom-5 left-5 inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-app-border [border-style:solid] bg-white text-app-text-soft shadow-sm hover:bg-app-surface-muted" onClick={() => { setPreviewError(null); setCurrentQuestionIndex((index) => Math.max(0, index - 1)); }} type="button"><ArrowLeft size={18} /></button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
