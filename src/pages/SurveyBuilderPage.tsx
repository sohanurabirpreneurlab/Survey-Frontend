import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Eye, GripVertical, MoveDown, MoveUp, Plus, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { useSurveyBuilder } from "../features/surveys/use-survey-builder";
import { SurveyStatusBadge } from "../features/surveys/SurveyStatusBadge";
import {
  accessModeLabels,
  formatDateTime,
  getQuestionOptions,
  questionSupportsOptions,
  questionTypeLabels,
  sortQuestions,
  sortSections
} from "../features/surveys/surveys.utils";
import type { Question, QuestionType } from "../features/surveys/surveys.types";

const DEFAULT_SURVEY_TITLE = "Untitled survey";
const DEFAULT_SECTION_TITLE = "Untitled section";
const DEFAULT_QUESTION_TITLE = "Untitled question";

const readBuilderFieldValue = (value: string, placeholderSeed: string) =>
  value === placeholderSeed ? "" : value;

const readBuilderDisplayTitle = (value: string, placeholderSeed: string) => value.trim() || placeholderSeed;

const DeleteDialog = ({
  children,
  description,
  onConfirm,
  title
}: {
  children: React.ReactNode;
  description: string;
  onConfirm: () => void | Promise<void>;
  title: string;
}) => (
  <AlertDialog.Root>
    <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="dialog-overlay" />
      <AlertDialog.Content className="survey-dialog">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description className="survey-dialog-copy">{description}</AlertDialog.Description>
        <div className="survey-dialog-actions">
          <AlertDialog.Cancel asChild>
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button onClick={() => void onConfirm()} size="sm" variant="danger">
              Delete
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);

const SettingsPanel = ({
  builder,
  mobile,
  mode = "auto"
}: {
  builder: ReturnType<typeof useSurveyBuilder>;
  mobile?: boolean;
  mode?: "auto" | "survey";
}) => {
  const [tab, setTab] = useState<"question" | "survey" | "validation">(mode === "survey" ? "survey" : builder.selectedQuestion ? "question" : "survey");

  const question = builder.selectedQuestion;
  const survey = builder.survey;
  const definition = builder.definition;
  const showSurveyOnly = mode === "survey";

  if (!survey || !definition) {
    return null;
  }

  return (
    <aside className={mobile ? "builder-settings-panel builder-settings-panel-mobile" : "builder-settings-panel"}>
      <div className="builder-settings-tabs" role="tablist" aria-label="Builder settings tabs">
        {(showSurveyOnly ? ["survey"] : question ? ["question", "validation"] : ["survey"]).map((item) => (
          <button
            aria-pressed={tab === item}
            className={tab === item ? "builder-settings-tab builder-settings-tab-active" : "builder-settings-tab"}
            key={item}
            onClick={() => setTab(item as typeof tab)}
            type="button"
          >
            {item === "survey" ? "Survey" : item === "validation" ? "Validation" : "Question"}
          </button>
        ))}
      </div>

      {(showSurveyOnly || !question) ? (
        <div className="builder-settings-stack">
          <label className="field">
            <span className="field-label">Survey title</span>
            <Input
              onChange={(event) => builder.updateDraftFields({ title: event.target.value })}
              placeholder={DEFAULT_SURVEY_TITLE}
              value={readBuilderFieldValue(definition.version.title, DEFAULT_SURVEY_TITLE)}
            />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="textarea"
              onChange={(event) => builder.updateDraftFields({ description: event.target.value })}
              rows={4}
              value={definition.version.description ?? ""}
            />
          </label>
          <label className="field">
            <span className="field-label">Access mode</span>
            <select
              className="input"
              onChange={(event) => builder.updateSurveyFields({ accessMode: event.target.value as typeof survey.accessMode })}
              value={survey.accessMode}
            >
              {Object.entries(accessModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Primary color</span>
            <div className="survey-color-field">
              <Input
                onChange={(event) =>
                  builder.updateDraftFields({
                    settings: {
                      ...definition.version.settings,
                      theme: {
                        ...definition.version.settings.theme,
                        primaryColor: event.target.value
                      }
                    }
                  })
                }
                type="color"
                value={definition.version.settings.theme.primaryColor ?? "#184fbe"}
              />
              <Input
                onChange={(event) =>
                  builder.updateDraftFields({
                    settings: {
                      ...definition.version.settings,
                      theme: {
                        ...definition.version.settings.theme,
                        primaryColor: event.target.value
                      }
                    }
                  })
                }
                value={definition.version.settings.theme.primaryColor ?? "#184fbe"}
              />
            </div>
          </label>
          <label className="field">
            <span className="field-label">Confirmation message</span>
            <textarea
              className="textarea"
              onChange={(event) =>
                builder.updateDraftFields({
                  settings: {
                    ...definition.version.settings,
                    confirmationMessage: event.target.value
                  }
                })
              }
              rows={4}
              value={definition.version.settings.confirmationMessage}
            />
          </label>
          <label className="builder-switch">
            <input
              checked={definition.version.settings.showProgressBar}
              onChange={(event) =>
                builder.updateDraftFields({
                  settings: {
                    ...definition.version.settings,
                    showProgressBar: event.target.checked
                  }
                })
              }
              type="checkbox"
            />
            <span>Show progress bar</span>
          </label>
          <label className="builder-switch">
            <input
              checked={definition.version.settings.shuffleQuestions}
              onChange={(event) =>
                builder.updateDraftFields({
                  settings: {
                    ...definition.version.settings,
                    shuffleQuestions: event.target.checked
                  }
                })
              }
              type="checkbox"
            />
            <span>Shuffle questions</span>
          </label>
        </div>
      ) : null}

      {!showSurveyOnly && question && tab === "question" ? (
        <div className="builder-settings-stack">
          <label className="field">
            <span className="field-label">Question title</span>
            <Input
              onChange={(event) => builder.updateQuestion(question.id, { title: event.target.value })}
              placeholder={DEFAULT_QUESTION_TITLE}
              value={readBuilderFieldValue(question.title, DEFAULT_QUESTION_TITLE)}
            />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="textarea"
              onChange={(event) => builder.updateQuestion(question.id, { description: event.target.value })}
              rows={4}
              value={question.description ?? ""}
            />
          </label>
          <label className="field">
            <span className="field-label">Question type</span>
            <select
              className="input"
              onChange={(event) => {
                const nextType = event.target.value as QuestionType;
                const needsConfirmation =
                  !questionSupportsOptions(nextType) && getQuestionOptions(definition, question.id).length > 0;

                if (needsConfirmation && !window.confirm("Changing the question type will remove existing options. Continue?")) {
                  return;
                }

                builder.updateQuestion(
                  question.id,
                  {
                    type: nextType,
                    validation: question.validation
                  },
                  { confirmRemoveOptions: needsConfirmation }
                );
              }}
              value={question.type}
            >
              {Object.entries(questionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="builder-switch">
            <input
              checked={question.required}
              onChange={(event) => builder.updateQuestion(question.id, { required: event.target.checked })}
              type="checkbox"
            />
            <span>Required question</span>
          </label>
        </div>
      ) : null}

      {!showSurveyOnly && question && tab === "validation" ? (
        <div className="builder-settings-stack">
          {question.type === "short_text" || question.type === "long_text" ? (
            <>
              <label className="field">
                <span className="field-label">Minimum length</span>
                <Input
                  onChange={(event) =>
                    builder.updateQuestion(question.id, {
                      validation: {
                        ...question.validation,
                        minLength: Number(event.target.value)
                      }
                    })
                  }
                  type="number"
                  value={String((question.validation.minLength as number | undefined) ?? 0)}
                />
              </label>
              <label className="field">
                <span className="field-label">Maximum length</span>
                <Input
                  onChange={(event) =>
                    builder.updateQuestion(question.id, {
                      validation: {
                        ...question.validation,
                        maxLength: Number(event.target.value)
                      }
                    })
                  }
                  type="number"
                  value={String((question.validation.maxLength as number | undefined) ?? 255)}
                />
              </label>
            </>
          ) : null}

          {question.type === "rating" ? (
            <>
              <label className="field">
                <span className="field-label">Minimum rating</span>
                <Input
                  onChange={(event) =>
                    builder.updateQuestion(question.id, {
                      validation: {
                        ...question.validation,
                        minimum: Number(event.target.value)
                      }
                    })
                  }
                  type="number"
                  value={String((question.validation.minimum as number | undefined) ?? 1)}
                />
              </label>
              <label className="field">
                <span className="field-label">Maximum rating</span>
                <Input
                  onChange={(event) =>
                    builder.updateQuestion(question.id, {
                      validation: {
                        ...question.validation,
                        maximum: Number(event.target.value)
                      }
                    })
                  }
                  type="number"
                  value={String((question.validation.maximum as number | undefined) ?? 5)}
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
};

const SURVEY_TAB_ID = "survey";

const QuestionCard = ({
  builder,
  question,
  sectionIndex
}: {
  builder: ReturnType<typeof useSurveyBuilder>;
  question: Question;
  sectionIndex: number;
}) => {
  const definition = builder.definition!;
  const questionOptions = getQuestionOptions(definition, question.id);
  const selected = builder.selectedQuestionId === question.id;

  return (
    <Card className={selected ? "builder-question-card builder-question-card-active" : "builder-question-card"}>
      <button
        className="builder-question-select"
        onClick={() => builder.setSelectedQuestionId(question.id)}
        type="button"
      >
        <span className="builder-question-index">
          Question {sectionIndex + 1}.{question.position + 1}
        </span>
        <GripVertical size={16} />
      </button>

      <label className="field">
        <span className="field-label">Question text</span>
        <Input
          onChange={(event) => builder.updateQuestion(question.id, { title: event.target.value })}
          placeholder={DEFAULT_QUESTION_TITLE}
          value={readBuilderFieldValue(question.title, DEFAULT_QUESTION_TITLE)}
        />
      </label>

      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          className="textarea"
          onChange={(event) => builder.updateQuestion(question.id, { description: event.target.value })}
          rows={3}
          value={question.description ?? ""}
        />
      </label>

      <div className="builder-question-row">
        <label className="field">
          <span className="field-label">Type</span>
          <select
            className="input"
            onChange={(event) => {
              const nextType = event.target.value as QuestionType;
              const needsConfirmation = !questionSupportsOptions(nextType) && questionOptions.length > 0;

              if (needsConfirmation && !window.confirm("Changing the question type will remove options from this draft. Continue?")) {
                return;
              }

              builder.updateQuestion(
                question.id,
                { type: nextType },
                { confirmRemoveOptions: needsConfirmation }
              );
            }}
            value={question.type}
          >
            {Object.entries(questionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-switch builder-switch-inline">
          <input
            checked={question.required}
            onChange={(event) => builder.updateQuestion(question.id, { required: event.target.checked })}
            type="checkbox"
          />
          <span>Required</span>
        </label>
      </div>

      {questionSupportsOptions(question.type) ? (
        <div className="builder-options-editor">
          <div className="builder-options-header">
            <h4>Options</h4>
            <Button onClick={() => void builder.addOption(question.id)} size="sm" variant="secondary">
              <Plus size={16} />
              Add option
            </Button>
          </div>
          {questionOptions.map((option) => (
            <div className="builder-option-row" key={option.id}>
              <Input
                aria-label={`Option for ${question.title}`}
                onChange={(event) =>
                  builder.updateOption(question.id, option.id, {
                    label: event.target.value,
                    value: event.target.value.trim().toLowerCase().replace(/\s+/g, "_")
                  })
                }
                value={option.label}
              />
              <Button aria-label="Move option up" onClick={() => void builder.moveOption(question.id, option.id, -1)} size="sm" variant="ghost">
                <MoveUp size={16} />
              </Button>
              <Button aria-label="Move option down" onClick={() => void builder.moveOption(question.id, option.id, 1)} size="sm" variant="ghost">
                <MoveDown size={16} />
              </Button>
              <DeleteDialog
                description="Deleting this option removes it from the draft only. Published response history is not changed."
                onConfirm={() => builder.deleteOption(question.id, option.id)}
                title="Delete option?"
              >
                <Button aria-label="Delete option" size="sm" variant="ghost">
                  <Trash2 size={16} />
                </Button>
              </DeleteDialog>
            </div>
          ))}
        </div>
      ) : null}

      <div className="builder-question-actions">
        <Button onClick={() => void builder.moveQuestion(question.id, -1)} size="sm" variant="ghost">
          <MoveUp size={16} />
          Move up
        </Button>
        <Button onClick={() => void builder.moveQuestion(question.id, 1)} size="sm" variant="ghost">
          <MoveDown size={16} />
          Move down
        </Button>
        <DeleteDialog
          description="Deleting this question removes it from the current draft only. Published response history will not be deleted."
          onConfirm={() => builder.deleteQuestion(question.id)}
          title="Delete question?"
        >
          <Button size="sm" variant="ghost">
            <Trash2 size={16} />
            Delete
          </Button>
        </DeleteDialog>
      </div>
    </Card>
  );
};

export const SurveyBuilderPage = () => {
  const { surveyId = "" } = useParams();
  const navigate = useNavigate();
  const builder = useSurveyBuilder(surveyId);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>(SURVEY_TAB_ID);

  const orderedSections = useMemo(
    () => (builder.definition ? sortSections(builder.definition.sections) : []),
    [builder.definition]
  );
  const definition = builder.definition;
  const activeSection =
    activeWorkspaceTab === SURVEY_TAB_ID
      ? null
      : orderedSections.find((section) => section.id === activeWorkspaceTab) ?? null;

  const selectSectionTab = (sectionId: string) => {
    if (!definition) {
      return;
    }

    setActiveWorkspaceTab(sectionId);
    builder.setSelectedSectionId(sectionId);
    builder.setSelectedQuestionId(
      sortQuestions(definition.questions.filter((question) => question.sectionId === sectionId))[0]?.id ?? null
    );
  };

  useEffect(() => {
    if (activeWorkspaceTab === SURVEY_TAB_ID) {
      return;
    }

    if (activeSection) {
      return;
    }

    setActiveWorkspaceTab(orderedSections[0]?.id ?? SURVEY_TAB_ID);
  }, [activeSection, activeWorkspaceTab, orderedSections]);

  if (builder.surveyQuery.isLoading || builder.definitionQuery.isLoading || !builder.survey || !definition) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading survey builder...</h1>
          <p>The draft definition is loading.</p>
        </section>
        <section className="survey-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card className="survey-card survey-card-skeleton" key={index}>
              <div className="survey-skeleton-line survey-skeleton-line-lg" />
              <div className="survey-skeleton-line" />
              <div className="survey-skeleton-line" />
            </Card>
          ))}
        </section>
      </div>
    );
  }

  if (builder.surveyQuery.isError || builder.definitionQuery.isError) {
    return (
      <Card className="dashboard-empty-state">
        <div>
          <h2>Survey not found or no longer available.</h2>
          <p>Try returning to the surveys page and reloading the builder.</p>
        </div>
        <Button asChild>
          <Link to="/app/surveys">Back to Surveys</Link>
        </Button>
      </Card>
    );
  }

  const onPublish = async () => {
    setPublishErrors([]);
    await builder.flushPendingSaves();

    try {
      await builder.publishMutation.mutateAsync();
      navigate(`/app/surveys/${surveyId}/preview`, { replace: true });
    } catch (error) {
      if (error instanceof Error && "details" in error && Array.isArray((error as { details: unknown }).details)) {
        setPublishErrors(
          ((error as { details: Array<{ message: string }> }).details ?? []).map((item) => item.message)
        );
      } else {
        setPublishErrors(["The draft is not ready to publish yet."]);
      }
    }
  };

  return (
    <div className="builder-page">
      <header className="builder-toolbar">
        <div className="builder-toolbar-main">
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/surveys">Surveys</Link>
          </Button>
          <div>
            <h1>{readBuilderDisplayTitle(definition.version.title, DEFAULT_SURVEY_TITLE)}</h1>
            <div className="builder-toolbar-meta">
              <SurveyStatusBadge status={builder.survey.status} />
              <span>Version {definition.version.versionNumber}</span>
              <span aria-live="polite">{builder.saveMessage}</span>
            </div>
          </div>
        </div>

        <div className="builder-toolbar-actions">
          <Button
            onClick={() => setShowMobileSettings(true)}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Settings2 size={16} />
            Settings
          </Button>
          <Button
            asChild
            onClick={() => void builder.flushPendingSaves()}
            size="sm"
            variant="secondary"
          >
            <Link to={`/app/surveys/${surveyId}/preview`}>
              <Eye size={16} />
              Preview
            </Link>
          </Button>
          {builder.isEditable ? (
            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <Button size="sm">Publish</Button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="dialog-overlay" />
                <AlertDialog.Content className="survey-dialog">
                  <AlertDialog.Title>Publish survey</AlertDialog.Title>
                  <AlertDialog.Description className="survey-dialog-copy">
                    Your survey will become available to respondents after the current draft is published.
                  </AlertDialog.Description>
                  <dl className="builder-publish-summary">
                    <div>
                      <dt>Access</dt>
                      <dd>{accessModeLabels[builder.survey.accessMode]}</dd>
                    </div>
                    <div>
                      <dt>Opens</dt>
                      <dd>{formatDateTime(builder.survey.opensAt) ?? "Immediately"}</dd>
                    </div>
                    <div>
                      <dt>Closes</dt>
                      <dd>{formatDateTime(builder.survey.closesAt) ?? "No closing date"}</dd>
                    </div>
                    <div>
                      <dt>Sections</dt>
                      <dd>{definition.sections.length}</dd>
                    </div>
                    <div>
                      <dt>Questions</dt>
                      <dd>{definition.questions.length}</dd>
                    </div>
                  </dl>
                  {publishErrors.length > 0 ? (
                    <InlineNotice tone="danger">
                      <ul className="builder-publish-errors">
                        {publishErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </InlineNotice>
                  ) : null}
                  <div className="survey-dialog-actions">
                    <AlertDialog.Cancel asChild>
                      <Button size="sm" variant="secondary">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <Button onClick={() => void onPublish()} size="sm">
                        {builder.publishMutation.isPending ? "Publishing..." : "Publish survey"}
                      </Button>
                    </AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          ) : (
              <Button
                disabled={builder.createDraftMutation.isPending}
                onClick={() => void builder.createDraftMutation.mutateAsync(undefined)}
                size="sm"
              >
                Create new draft version
            </Button>
          )}
        </div>
      </header>

      {!builder.isEditable ? (
        <InlineNotice icon={<CheckCircle2 size={16} />}>
          This version is published and cannot be edited directly. Create a new draft version to continue editing.
        </InlineNotice>
      ) : null}

      <div className="builder-layout">
        <main className="builder-canvas builder-workspace">
          <div className="builder-panel-header builder-workspace-header">
            <h2>Builder tabs</h2>
            {builder.isEditable ? (
              <Button
                onClick={async () => {
                  const section = await builder.addSection();
                  if (section) {
                    selectSectionTab(section.id);
                  }
                }}
                size="sm"
                variant="secondary"
              >
                <Plus size={16} />
                Add section
              </Button>
            ) : null}
          </div>

          <div className="builder-section-tabs" role="tablist" aria-label="Survey builder tabs">
            <button
              aria-selected={activeWorkspaceTab === SURVEY_TAB_ID}
              className={
                activeWorkspaceTab === SURVEY_TAB_ID
                  ? "builder-section-tab builder-section-tab-active"
                  : "builder-section-tab"
              }
              onClick={() => setActiveWorkspaceTab(SURVEY_TAB_ID)}
              role="tab"
              title="Survey settings"
              type="button"
            >
              <strong>Survey</strong>
              <div className="builder-section-tab-meta">
                <span>Title, description, access, theme</span>
                <span className="builder-section-tab-badge">Settings</span>
              </div>
            </button>
            {orderedSections.map((section, index) => (
              (() => {
                const questionCount = definition.questions.filter((question) => question.sectionId === section.id).length;

                return (
              <button
                aria-selected={activeWorkspaceTab === section.id}
                className={
                  activeWorkspaceTab === section.id
                    ? "builder-section-tab builder-section-tab-active"
                    : "builder-section-tab"
                }
                key={section.id}
                onClick={() => selectSectionTab(section.id)}
                role="tab"
                title={`${questionCount} questions`}
                type="button"
              >
                <div>
                  <strong>
                    {index + 1}. {readBuilderDisplayTitle(section.title, DEFAULT_SECTION_TITLE)}
                  </strong>
                  <div className="builder-section-tab-meta">
                    <span>Section workspace</span>
                    <span className="builder-section-tab-badge">{questionCount}</span>
                  </div>
                </div>
              </button>
                );
              })()
            ))}
          </div>

          {activeWorkspaceTab === SURVEY_TAB_ID ? (
            <SettingsPanel builder={builder} mode="survey" />
          ) : activeSection ? (
            <section className="builder-section-block" key={activeSection.id}>
              {(() => {
                const sectionQuestions = sortQuestions(
                  definition.questions.filter((question) => question.sectionId === activeSection.id)
                );
                const sectionIndex = orderedSections.findIndex((section) => section.id === activeSection.id);

                return (
                  <>
                <Card className="builder-section-card">
                  <div className="builder-section-card-head">
                    <div>
                      <span className="builder-section-number">Section {sectionIndex + 1}</span>
                      <Input
                        onChange={(event) => builder.updateSection(activeSection.id, { title: event.target.value })}
                        placeholder={DEFAULT_SECTION_TITLE}
                        value={readBuilderFieldValue(activeSection.title, DEFAULT_SECTION_TITLE)}
                      />
                    </div>
                    {builder.isEditable ? (
                      <div className="builder-section-actions">
                        <Button aria-label="Move section up" onClick={() => void builder.moveSection(activeSection.id, -1)} size="sm" variant="ghost">
                          <MoveUp size={16} />
                        </Button>
                        <Button aria-label="Move section down" onClick={() => void builder.moveSection(activeSection.id, 1)} size="sm" variant="ghost">
                          <MoveDown size={16} />
                        </Button>
                        <DeleteDialog
                          description="Deleting this section removes the draft questions inside it. Published response history is not deleted."
                          onConfirm={() => builder.deleteSection(activeSection.id)}
                          title="Delete section?"
                        >
                          <Button aria-label="Delete section" size="sm" variant="ghost">
                            <Trash2 size={16} />
                          </Button>
                        </DeleteDialog>
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    className="textarea"
                    onChange={(event) => builder.updateSection(activeSection.id, { description: event.target.value })}
                    placeholder="Optional section description"
                    rows={3}
                    value={activeSection.description ?? ""}
                  />
                </Card>

                <div className="builder-question-stack">
                  {sectionQuestions.map((question) => (
                    <QuestionCard
                      builder={builder}
                      key={question.id}
                      question={question}
                      sectionIndex={sectionIndex}
                    />
                  ))}
                </div>

                {builder.isEditable ? (
                  <div className="builder-add-row">
                    <Button onClick={() => void builder.addQuestion(activeSection.id)} size="sm" variant="secondary">
                      <Plus size={16} />
                      Add question
                    </Button>
                  </div>
                ) : null}
                  </>
                );
              })()}
            </section>
          ) : null}
        </main>
      </div>

      <Dialog.Root onOpenChange={setShowMobileSettings} open={showMobileSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="builder-mobile-settings">
            <Dialog.Title>Settings</Dialog.Title>
            <SettingsPanel builder={builder} mobile />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
