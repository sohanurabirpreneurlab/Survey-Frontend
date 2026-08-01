import { MonitorSmartphone, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { inputClassName } from "../components/ui/input";
import { useAuth } from "../features/auth/use-auth";
import { getSurveyRequest, getSurveyVersionRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import {
  formatDateTime,
  getQuestionOptions,
  questionSupportsOptions,
  questionTypeLabels,
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
        <Card className={cn("grid w-full max-w-[840px] gap-[22px] overflow-hidden pb-6", mode === "mobile" && "max-w-[420px]")}>
          <div
            className="h-3 w-full"
            style={{ backgroundColor: definition.version.settings.theme.primaryColor ?? "#184fbe" }}
          />
          <div className="mx-6 grid gap-3.5 pt-2">
            <h2>{definition.version.title}</h2>
            {definition.version.description ? <p>{definition.version.description}</p> : null}
          </div>

          {sections.map((section, sectionIndex) => (
            <section className={surveyTw.runtimeSection} key={section.id}>
              <div>
                <span>Section {sectionIndex + 1}</span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
              </div>
              <div className="grid gap-4">
                {sortQuestions(definition.questions.filter((question) => question.sectionId === section.id)).map((question) => {
                  const options = getQuestionOptions(definition, question.id);

                  return (
                    <div className={surveyTw.runtimeQuestion} key={question.id}>
                      <div className="flex items-center justify-between">
                        <h4>
                          {question.title}
                          {question.required ? <span> *</span> : null}
                        </h4>
                        <span>{questionTypeLabels[question.type]}</span>
                      </div>
                      {question.description ? <p>{question.description}</p> : null}
                      {questionSupportsOptions(question.type) ? (
                        <div className="grid gap-2.5">
                          {options.map((option) => (
                            <label className={surveyTw.runtimeOption} key={option.id}>
                              <input type={question.type === "multiple_choice" ? "checkbox" : "radio"} />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input className={inputClassName} disabled placeholder={readQuestionPlaceholder(question.type)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </Card>
      </div>
    </div>
  );
};
