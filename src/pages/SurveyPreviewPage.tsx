import { MonitorSmartphone, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
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
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading preview...</h1>
          <p>The selected survey version is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="survey-preview-header">
        <div>
          <h1>Preview</h1>
          <p>Responses entered here will not be saved.</p>
        </div>
        <div className="survey-preview-actions">
          <Button asChild size="sm" variant="secondary">
            <Link to={`/app/surveys/${surveyId}/builder`}>Back to builder</Link>
          </Button>
          <div className="survey-preview-toggle" role="tablist" aria-label="Preview mode">
            <button
              aria-pressed={mode === "desktop"}
              className={mode === "desktop" ? "survey-tab survey-tab-active" : "survey-tab"}
              onClick={() => setMode("desktop")}
              type="button"
            >
              <MonitorSmartphone size={16} />
              Desktop
            </button>
            <button
              aria-pressed={mode === "mobile"}
              className={mode === "mobile" ? "survey-tab survey-tab-active" : "survey-tab"}
              onClick={() => setMode("mobile")}
              type="button"
            >
              <Smartphone size={16} />
              Mobile
            </button>
          </div>
        </div>
      </section>

      <Card className="survey-preview-banner">
        <p>
          Preview mode only. This page renders the active {surveyQuery.data.currentDraftVersionId ? "draft" : "published"} version.
        </p>
        <span>
          Opens: {formatDateTime(surveyQuery.data.opensAt) ?? "Immediately"} | Closes:{" "}
          {formatDateTime(surveyQuery.data.closesAt) ?? "No closing date"}
        </span>
      </Card>

      <div className={mode === "mobile" ? "survey-preview-shell survey-preview-shell-mobile" : "survey-preview-shell"}>
        <Card className="survey-runtime-card">
          <div
            className="survey-runtime-accent"
            style={{ backgroundColor: definition.version.settings.theme.primaryColor ?? "#184fbe" }}
          />
          <div className="survey-runtime-header">
            <h2>{definition.version.title}</h2>
            {definition.version.description ? <p>{definition.version.description}</p> : null}
          </div>

          {sections.map((section, sectionIndex) => (
            <section className="survey-runtime-section" key={section.id}>
              <div className="survey-runtime-section-head">
                <span>Section {sectionIndex + 1}</span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
              </div>
              <div className="survey-runtime-question-stack">
                {sortQuestions(definition.questions.filter((question) => question.sectionId === section.id)).map((question) => {
                  const options = getQuestionOptions(definition, question.id);

                  return (
                    <div className="survey-runtime-question" key={question.id}>
                      <div className="survey-runtime-question-head">
                        <h4>
                          {question.title}
                          {question.required ? <span> *</span> : null}
                        </h4>
                        <span>{questionTypeLabels[question.type]}</span>
                      </div>
                      {question.description ? <p>{question.description}</p> : null}
                      {questionSupportsOptions(question.type) ? (
                        <div className="survey-runtime-options">
                          {options.map((option) => (
                            <label className="survey-runtime-option" key={option.id}>
                              <input type={question.type === "multiple_choice" ? "checkbox" : "radio"} />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input className="input" disabled placeholder={readQuestionPlaceholder(question.type)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <Card className="survey-runtime-confirmation">
            <h3>Confirmation screen preview</h3>
            <p>{definition.version.settings.confirmationMessage}</p>
          </Card>
        </Card>
      </div>
    </div>
  );
};
