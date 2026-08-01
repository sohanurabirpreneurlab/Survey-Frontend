import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { Calculator, CheckCircle2, Eye, GripVertical, MoveDown, MoveUp, Plus, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import {
  buildQuestionGroupsBySection,
  buildQuestionUsageById,
  buildSectionConditionsById,
  formatScoreCondition,
  getQuestionScoreRange,
  isQuestionScoringEnabled,
  isScoringEligibleQuestion,
  validateCalculatedScoreDraft
} from "../features/surveys/survey-scoring";
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
import type {
  CalculatedScoreThresholdOperator,
  Question,
  QuestionType,
  SurveyCalculatedScore
} from "../features/surveys/surveys.types";
import { cn } from "../lib/cn";
import { pageTw } from "../lib/page-tailwind";

const DEFAULT_SURVEY_TITLE = "Untitled survey";
const DEFAULT_SECTION_TITLE = "Untitled section";
const DEFAULT_QUESTION_TITLE = "Untitled question";
const CALCULATED_SCORES_TAB_ID = "calculated-scores";
const workspaceTabClassName =
  "grid min-w-[220px] shrink-0 cursor-pointer gap-2 rounded-[18px] border border-app-border [border-style:solid] bg-app-builder-tab px-[18px] py-3.5 text-left shadow-[0_10px_24px_rgba(18,48,79,0.06)] transition-[transform,box-shadow,border-color] duration-[160ms] hover:-translate-y-px hover:border-app-border-strong hover:shadow-[0_14px_30px_rgba(18,48,79,0.1)] max-app-tablet:min-w-[200px] max-app-mobile:min-w-[170px]";
const workspaceTabActiveClassName =
  "border-app-primary bg-app-builder-tab-active shadow-[0_0_0_4px_rgba(24,79,190,0.1)]";
const workspaceTabMetaClassName = "flex items-center justify-between gap-2.5";
const workspaceTabBadgeClassName =
  "min-w-[34px] rounded-full border border-[rgba(24,79,190,0.14)] [border-style:solid] bg-app-primary-soft px-2.5 py-1 text-center text-[0.8rem] font-bold text-app-primary-strong";
const builderFieldClassName = "grid gap-2";
const builderFieldLabelClassName = "text-[0.95rem] font-semibold";
const builderTextareaClassName =
  "min-h-[120px] w-full resize-y appearance-none rounded-[14px] border border-app-border [border-style:solid] bg-white px-4 py-3.5 text-app-text outline-none transition-[border-color,box-shadow] duration-[140ms] focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]";
const builderSelectClassName =
  "min-h-[50px] w-full appearance-none rounded-[14px] border border-app-border [border-style:solid] bg-white px-4 py-0 text-app-text outline-none transition-[border-color,box-shadow] duration-[140ms] focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]";
const builderSwitchClassName = "grid gap-1.5 rounded-[14px] bg-app-surface-muted px-3.5 py-3 [grid-auto-flow:column] items-center justify-start accent-app-primary";
const builderDialogOverlayClassName = "fixed inset-0 z-[45] bg-[rgba(18,48,79,0.32)]";
const builderDialogClassName = "fixed top-1/2 left-1/2 z-[46] grid max-h-[min(720px,calc(100vh-32px))] w-full max-w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-app-md border border-app-border [border-style:solid] bg-white p-6 shadow-app max-app-tablet:top-1/2";
const builderDialogActionsClassName = "flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch";
const thresholdOperatorLabels: Record<CalculatedScoreThresholdOperator, string> = {
  equal: "=",
  greater_than: ">",
  greater_than_or_equal: ">=",
  less_than: "<",
  less_than_or_equal: "<="
};

const readQuestionUsageLabel = (
  usage: Array<{
    name: string;
  }>
) => {
  if (usage.length === 1) {
    return `Used in ${usage[0].name}`;
  }

  return `Used in ${usage.length} scores`;
};

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
      <AlertDialog.Overlay className={builderDialogOverlayClassName} />
      <AlertDialog.Content className={builderDialogClassName}>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description className="m-0 text-app-text-soft">{description}</AlertDialog.Description>
        <div className={builderDialogActionsClassName}>
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
    <aside className={cn("grid min-w-0 gap-3.5 rounded-app-md border border-app-border [border-style:solid] bg-white/[0.94] p-[18px]", mobile && "w-full")}>
      <div className="mt-[18px] flex flex-wrap gap-2.5" role="tablist" aria-label="Builder settings tabs">
        {(showSurveyOnly ? ["survey"] : question ? ["question", "validation"] : ["survey"]).map((item) => (
          <button
            aria-pressed={tab === item}
            className={cn("inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-app-border [border-style:solid] bg-app-surface-muted px-3.5 text-app-text-soft", tab === item && "border-app-border-strong bg-app-primary-soft text-app-primary-strong")}
            key={item}
            onClick={() => setTab(item as typeof tab)}
            type="button"
          >
            {item === "survey" ? "Survey" : item === "validation" ? "Validation" : "Question"}
          </button>
        ))}
      </div>

      {(showSurveyOnly || !question) ? (
        <div className="grid gap-4">
            <label className={builderFieldClassName}>
              <span className={builderFieldLabelClassName}>Survey title</span>
              <Input
                onChange={(event) => builder.updateDraftFields({ title: event.target.value })}
                placeholder={DEFAULT_SURVEY_TITLE}
                value={readBuilderFieldValue(definition.version.title, DEFAULT_SURVEY_TITLE)}
              />
            </label>
            <label className={builderFieldClassName}>
              <span className={builderFieldLabelClassName}>Description</span>
              <textarea
                className={builderTextareaClassName}
                onChange={(event) => builder.updateDraftFields({ description: event.target.value })}
                rows={4}
                value={definition.version.description ?? ""}
              />
            </label>
            <label className={builderFieldClassName}>
              <span className={builderFieldLabelClassName}>Access mode</span>
              <select
                className={builderSelectClassName}
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
            <label className={builderFieldClassName}>
              <span className={builderFieldLabelClassName}>Primary color</span>
              <div className="flex items-center justify-between gap-3">
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
            <label className={builderFieldClassName}>
              <span className={builderFieldLabelClassName}>Confirmation message</span>
              <textarea
                className={builderTextareaClassName}
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
            <label className={builderSwitchClassName}>
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
            <label className={builderSwitchClassName}>
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
        <div className="grid gap-4">
          <label className={builderFieldClassName}>
            <span className={builderFieldLabelClassName}>Question title</span>
            <Input
              onChange={(event) => builder.updateQuestion(question.id, { title: event.target.value })}
              placeholder={DEFAULT_QUESTION_TITLE}
              value={readBuilderFieldValue(question.title, DEFAULT_QUESTION_TITLE)}
            />
          </label>
          <label className={builderFieldClassName}>
            <span className={builderFieldLabelClassName}>Description</span>
            <textarea
              className={builderTextareaClassName}
              onChange={(event) => builder.updateQuestion(question.id, { description: event.target.value })}
              rows={4}
              value={question.description ?? ""}
            />
          </label>
          <label className={builderFieldClassName}>
            <span className={builderFieldLabelClassName}>Question type</span>
            <select
              className={builderSelectClassName}
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
          <label className={builderSwitchClassName}>
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
        <div className="grid gap-4">
          {question.type === "short_text" || question.type === "long_text" ? (
            <>
              <label className={builderFieldClassName}>
                <span className={builderFieldLabelClassName}>Minimum length</span>
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
              <label className={builderFieldClassName}>
                <span className={builderFieldLabelClassName}>Maximum length</span>
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
              <label className={builderFieldClassName}>
                <span className={builderFieldLabelClassName}>Minimum rating</span>
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
              <label className={builderFieldClassName}>
                <span className={builderFieldLabelClassName}>Maximum rating</span>
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

const CalculatedScoresPanel = ({ builder }: { builder: ReturnType<typeof useSurveyBuilder> }) => {
  const definition = builder.definition;
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  if (!definition) {
    return null;
  }

  const scoreQuestions = definition.questions.filter((question) => isScoringEligibleQuestion(question));
  const questionUsageById = buildQuestionUsageById(definition.calculatedScores);
  const groupedQuestions = buildQuestionGroupsBySection(sortSections(definition.sections), sortQuestions(definition.questions));

  const buildDraft = (score?: SurveyCalculatedScore) => ({
    calculationType: score?.calculationType ?? "average",
    decimalPlaces: score?.decimalPlaces ?? 2,
    key: score?.key ?? "",
    name: score?.name ?? "",
    requireAllAnswers: score?.requireAllAnswers ?? false,
    sourceQuestionIds: score?.questions.map((question) => question.questionId) ?? [],
    targets:
      score?.targets.map((target) => ({
        targetId: target.targetId,
        targetType: target.targetType
      })) ?? [],
    thresholdOperator: score?.thresholdOperator ?? "less_than_or_equal",
    thresholdValue: score?.thresholdValue ?? 0
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3>Calculated scores</h3>
          <p>Configure score groups, thresholds, and follow-up targets for this survey version.</p>
        </div>
        {builder.isEditable ? (
          <Button onClick={() => setActiveDraftId("new")} size="sm" variant="secondary">
            <Plus size={16} />
            Add calculated score
          </Button>
        ) : null}
      </div>

      {definition.calculatedScores.length === 0 ? (
        <Card className={pageTw.empty}>
          <div>
            <h4>No calculated scores yet</h4>
            <p>Create a calculated score to show follow-up questions or sections based on score thresholds.</p>
          </div>
        </Card>
      ) : null}

      {definition.calculatedScores.map((score) => (
        <CalculatedScoreCard
          builder={builder}
          definition={definition}
          groupedQuestions={groupedQuestions}
          initialValue={buildDraft(score)}
          isExpanded={activeDraftId === score.id}
          key={score.id}
          onToggle={() => setActiveDraftId((current) => (current === score.id ? null : score.id))}
          questionUsageById={questionUsageById}
          score={score}
          scoreQuestions={scoreQuestions}
        />
      ))}

      {builder.isEditable && activeDraftId === "new" ? (
        <CalculatedScoreCard
          builder={builder}
          definition={definition}
          groupedQuestions={groupedQuestions}
          initialValue={buildDraft()}
          isExpanded
          onToggle={() => setActiveDraftId(null)}
          questionUsageById={questionUsageById}
          score={null}
          scoreQuestions={scoreQuestions}
        />
      ) : null}
    </div>
  );
};

const CalculatedScoreCard = ({
  builder,
  definition,
  groupedQuestions,
  initialValue,
  isExpanded,
  onToggle,
  questionUsageById,
  score,
  scoreQuestions
}: {
  builder: ReturnType<typeof useSurveyBuilder>;
  definition: NonNullable<ReturnType<typeof useSurveyBuilder>["definition"]>;
  groupedQuestions: ReturnType<typeof buildQuestionGroupsBySection>;
  initialValue: {
    calculationType: "average";
    decimalPlaces: number;
    key: string;
    name: string;
    requireAllAnswers: boolean;
    sourceQuestionIds: string[];
    targets: Array<{
      targetId: string;
      targetType: "question" | "section";
    }>;
    thresholdOperator: CalculatedScoreThresholdOperator;
    thresholdValue: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
  questionUsageById: ReturnType<typeof buildQuestionUsageById>;
  score: SurveyCalculatedScore | null;
  scoreQuestions: Question[];
}) => {
  const [draft, setDraft] = useState(initialValue);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  const updateDraft = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleSourceQuestion = (questionId: string) => {
    const isSelected = draft.sourceQuestionIds.includes(questionId);

    if (!isSelected) {
      updateDraft(
        "targets",
        draft.targets.filter((target) => !(target.targetType === "question" && target.targetId === questionId))
      );
    }

    updateDraft(
      "sourceQuestionIds",
      isSelected
        ? draft.sourceQuestionIds.filter((id) => id !== questionId)
        : [...draft.sourceQuestionIds, questionId]
    );
  };

  const updateTargets = (targetType: "question" | "section", targetIds: string[]) =>
    updateDraft("targets", [
      ...draft.targets.filter((target) => target.targetType !== targetType),
      ...targetIds.map((targetId) => ({ targetId, targetType }))
    ]);

  const save = async () => {
    const nextErrors = validateCalculatedScoreDraft({
      definition,
      draft,
      existingScoreId: score?.id ?? null
    });

    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      return;
    }

    setSaving(true);

    try {
      await builder.upsertCalculatedScore(score?.id ?? null, draft);
      setErrors([]);
      if (!score) {
        onToggle();
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedSectionIds = draft.targets.filter((target) => target.targetType === "section").map((target) => target.targetId);
  const selectedQuestionIds = draft.targets.filter((target) => target.targetType === "question").map((target) => target.targetId);

  return (
    <Card className="grid gap-4 px-5 py-[22px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3.5">
        <div>
          <span className="mb-2 inline-block text-[0.82rem] font-bold text-app-primary uppercase">Calculated score</span>
          <h4>{score ? score.name : "New score configuration"}</h4>
          {score ? <p>{formatScoreCondition(score)}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onToggle} size="sm" variant="ghost">
            {isExpanded ? "Collapse" : "Edit"}
          </Button>
          {score ? (
            <DeleteDialog
              description="Deleting this calculated score removes its threshold-based follow-up behavior from the draft."
              onConfirm={() => builder.deleteCalculatedScore(score.id)}
              title="Delete calculated score?"
            >
              <Button size="sm" variant="ghost">
                <Trash2 size={16} />
                Delete
              </Button>
            </DeleteDialog>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <label className={builderFieldClassName}>
          <span className={builderFieldLabelClassName}>Name</span>
          <Input onChange={(event) => updateDraft("name", event.target.value)} value={draft.name} />
        </label>
        <label className={builderFieldClassName}>
          <span className={builderFieldLabelClassName}>Key</span>
          <Input onChange={(event) => updateDraft("key", event.target.value.toUpperCase())} value={draft.key} />
        </label>
        <label className={builderFieldClassName}>
          <span className={builderFieldLabelClassName}>Threshold operator</span>
          <select
            className={builderSelectClassName}
            onChange={(event) => updateDraft("thresholdOperator", event.target.value as CalculatedScoreThresholdOperator)}
            value={draft.thresholdOperator}
          >
            {Object.entries(thresholdOperatorLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={builderFieldClassName}>
          <span className={builderFieldLabelClassName}>Threshold value</span>
          <Input
            onChange={(event) => updateDraft("thresholdValue", Number(event.target.value))}
            type="number"
            value={String(draft.thresholdValue)}
          />
        </label>
      </div>

        <label className={builderSwitchClassName}>
          <input
            checked={draft.requireAllAnswers}
            onChange={(event) => updateDraft("requireAllAnswers", event.target.checked)}
            type="checkbox"
        />
        <span>Require answers for every source question</span>
      </label>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <div className="grid gap-2.5 rounded-2xl border border-app-border [border-style:solid] bg-app-surface-muted p-3.5">
          <h5>Source questions</h5>
          {groupedQuestions.map(({ questions, section }) => (
            <div key={section.id}>
              <strong>{section.title}</strong>
              {questions.map((question) => {
                const options = definition.options.filter((option) => option.questionId === question.id);
                const isEligible = isScoringEligibleQuestion(question);
                const scoringEnabled = isQuestionScoringEnabled(question, options);
                const range = getQuestionScoreRange(question, options);
                const usage = questionUsageById.get(question.id) ?? [];

                return (
                  <label
                    aria-disabled={!isEligible || !scoringEnabled}
                    className="flex items-start gap-2.5 [&+&]:mt-1.5"
                    key={question.id}
                    title={usage.length > 0 ? usage.map((item) => item.name).join(", ") : undefined}
                  >
                    <input
                      checked={draft.sourceQuestionIds.includes(question.id)}
                      disabled={!isEligible || !scoringEnabled}
                      onChange={() => toggleSourceQuestion(question.id)}
                      type="checkbox"
                    />
                    <span>
                      {question.title}
                      {!isEligible ? " - Not eligible for scoring" : null}
                      {isEligible && !scoringEnabled ? " - Configure scoring first" : null}
                      {range ? ` - Scale ${range.minimum}-${range.maximum}` : null}
                      {usage.length > 0 ? ` - ${readQuestionUsageLabel(usage)}` : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        <div className="grid gap-2.5 rounded-2xl border border-app-border [border-style:solid] bg-app-surface-muted p-3.5">
          <h5>Follow-up sections</h5>
          {sortSections(definition.sections).map((section) => (
            (() => {
              const containsSourceQuestion = definition.questions.some(
                (question) => question.sectionId === section.id && draft.sourceQuestionIds.includes(question.id)
              );

              return (
                <label aria-disabled={containsSourceQuestion} className="flex items-start gap-2.5 [&+&]:mt-1.5" key={section.id}>
                  <input
                    checked={selectedSectionIds.includes(section.id)}
                    disabled={containsSourceQuestion}
                    onChange={(event) =>
                      updateTargets(
                        "section",
                        event.target.checked
                          ? [...selectedSectionIds, section.id]
                          : selectedSectionIds.filter((id) => id !== section.id)
                      )
                    }
                    type="checkbox"
                  />
                  <span>
                    {section.title}
                    {containsSourceQuestion ? " - Unavailable: contains a source question" : null}
                  </span>
                </label>
              );
            })()
          ))}
        </div>

        <div className="grid gap-2.5 rounded-2xl border border-app-border [border-style:solid] bg-app-surface-muted p-3.5">
          <h5>Follow-up questions</h5>
          {sortQuestions(definition.questions).map((question) => {
            const isSourceQuestion = draft.sourceQuestionIds.includes(question.id);

            return (
              <label
                aria-disabled={isSourceQuestion}
                className="flex items-start gap-2.5 [&+&]:mt-1.5"
                key={question.id}
              >
                <input
                  checked={selectedQuestionIds.includes(question.id)}
                  disabled={isSourceQuestion}
                  onChange={(event) =>
                    updateTargets(
                      "question",
                      event.target.checked
                        ? [...selectedQuestionIds, question.id]
                        : selectedQuestionIds.filter((id) => id !== question.id)
                    )
                  }
                  type="checkbox"
                />
                <span>
                  {question.title}
                  {isSourceQuestion ? " - Unavailable: selected as a source question" : null}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {builder.isEditable ? (
        <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
          <Button onClick={() => void save()} size="sm">
            <Calculator size={16} />
            {saving ? "Saving..." : score ? "Save score config" : "Create calculated score"}
          </Button>
        </div>
      ) : null}
      {errors.length > 0 ? (
        <InlineNotice tone="danger">
          <ul className="m-0 pl-[18px]">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </InlineNotice>
      ) : null}
        </div>
      ) : null}
    </Card>
  );
};

const SURVEY_TAB_ID = "survey";

const QuestionCard = ({
  builder,
  question,
  sectionIndex,
  usage
}: {
  builder: ReturnType<typeof useSurveyBuilder>;
  question: Question;
  sectionIndex: number;
  usage: Array<{ name: string }>;
}) => {
  const definition = builder.definition!;
  const questionOptions = getQuestionOptions(definition, question.id);
  const selected = builder.selectedQuestionId === question.id;
  const scoringEnabled = isQuestionScoringEnabled(question, questionOptions);
  const scoringEligible = isScoringEligibleQuestion(question);

  return (
    <Card className={cn("grid gap-4 p-[18px]", selected && "border-app-primary shadow-[0_0_0_4px_rgba(24,79,190,0.1)]")}>
      <button
        className="flex cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-app-text-soft"
        onClick={() => builder.setSelectedQuestionId(question.id)}
        type="button"
      >
        <span className="text-app-text-soft">
          Question {sectionIndex + 1}.{question.position + 1}
        </span>
        <GripVertical size={16} />
      </button>

      <label className={builderFieldClassName}>
        <span className={builderFieldLabelClassName}>Question text</span>
        <Input
          onChange={(event) => builder.updateQuestion(question.id, { title: event.target.value })}
          placeholder={DEFAULT_QUESTION_TITLE}
          value={readBuilderFieldValue(question.title, DEFAULT_QUESTION_TITLE)}
        />
      </label>

      <label className={builderFieldClassName}>
        <span className={builderFieldLabelClassName}>Description</span>
        <textarea
          className={builderTextareaClassName}
          onChange={(event) => builder.updateQuestion(question.id, { description: event.target.value })}
          rows={3}
          value={question.description ?? ""}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {scoringEnabled ? <span className="rounded-full border border-app-border-strong [border-style:solid] bg-app-primary-soft px-2.5 py-1 text-[0.8rem] font-bold text-app-primary-strong">Scored</span> : null}
        {usage.length > 0 ? (
          <span className="rounded-full border border-app-border-strong [border-style:solid] bg-app-primary-soft px-2.5 py-1 text-[0.8rem] font-bold text-app-primary-strong" title={usage.map((item) => item.name).join(", ")}>
            {readQuestionUsageLabel(usage)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
        <label className={builderFieldClassName}>
          <span className={builderFieldLabelClassName}>Type</span>
          <select
            className={builderSelectClassName}
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

        <label className={cn(builderSwitchClassName, "mt-[26px]")}>
          <input
            checked={question.required}
            onChange={(event) => builder.updateQuestion(question.id, { required: event.target.checked })}
            type="checkbox"
          />
          <span>Required</span>
        </label>
      </div>

      {scoringEligible ? (
        <label className={builderSwitchClassName}>
          <input
            checked={scoringEnabled}
            onChange={(event) => {
              const nextChecked = event.target.checked;
              if (!nextChecked && usage.length > 0) {
                window.alert(
                  `This question is used by ${usage.map((item) => `"${item.name}"`).join(", ")}. Remove it from those calculated scores before disabling numeric scoring.`
                );
                return;
              }

              builder.updateQuestion(question.id, {
                settings: {
                  ...question.settings,
                  scoringEnabled: nextChecked
                }
              });

              if (!nextChecked && (question.type === "single_choice" || question.type === "vote")) {
                void builder.updateOptionScores(
                  question.id,
                  questionOptions.map((option) => ({
                    optionId: option.id,
                    scoreValue: null
                  }))
                );
              }
            }}
            type="checkbox"
          />
          <span>Enable numeric scoring</span>
        </label>
      ) : null}

      {questionSupportsOptions(question.type) ? (
        <div className="grid gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h4>Options</h4>
            <Button onClick={() => void builder.addOption(question.id)} size="sm" variant="secondary">
              <Plus size={16} />
              Add option
            </Button>
          </div>
          {questionOptions.map((option) => (
            <div className="flex items-center gap-2" key={option.id}>
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
              {(question.type === "single_choice" || question.type === "vote") && scoringEnabled ? (
                <Input
                  aria-label={`Score for ${option.label}`}
                  className="basis-[108px]"
                  onChange={(event) =>
                    void builder.updateOptionScores(question.id, [
                      {
                        optionId: option.id,
                        scoreValue: event.target.value === "" ? null : Number(event.target.value)
                      }
                    ])
                  }
                  placeholder="Score"
                  type="number"
                  value={option.scoreValue === null ? "" : String(option.scoreValue)}
                />
              ) : null}
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

      <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
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
    activeWorkspaceTab === SURVEY_TAB_ID || activeWorkspaceTab === CALCULATED_SCORES_TAB_ID
      ? null
      : orderedSections.find((section) => section.id === activeWorkspaceTab) ?? null;
  const questionUsageById = useMemo(
    () => buildQuestionUsageById(definition?.calculatedScores ?? []),
    [definition?.calculatedScores]
  );
  const sectionConditionsById = useMemo(
    () => buildSectionConditionsById(definition?.calculatedScores ?? []),
    [definition?.calculatedScores]
  );

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
    if (activeWorkspaceTab === SURVEY_TAB_ID || activeWorkspaceTab === CALCULATED_SCORES_TAB_ID) {
      return;
    }

    if (activeSection) {
      return;
    }

    setActiveWorkspaceTab(orderedSections[0]?.id ?? SURVEY_TAB_ID);
  }, [activeSection, activeWorkspaceTab, orderedSections]);

  if (builder.surveyQuery.isLoading || builder.definitionQuery.isLoading || !builder.survey || !definition) {
    return (
      <div className={pageTw.page}>
        <section className={pageTw.hero}>
          <h1 className={pageTw.heroTitle}>Loading survey builder...</h1>
          <p className={pageTw.muted}>The draft definition is loading.</p>
        </section>
        <section className={pageTw.gridTwo}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card className="pointer-events-none grid gap-[18px] p-[22px]" key={index}>
              <div className="h-[18px] w-[48%] rounded-full bg-[linear-gradient(90deg,#eff5ff_0%,#f8fbff_50%,#eff5ff_100%)]" />
              <div className="h-3 w-[72%] rounded-full bg-[linear-gradient(90deg,#eff5ff_0%,#f8fbff_50%,#eff5ff_100%)]" />
              <div className="h-3 w-[72%] rounded-full bg-[linear-gradient(90deg,#eff5ff_0%,#f8fbff_50%,#eff5ff_100%)]" />
            </Card>
          ))}
        </section>
      </div>
    );
  }

  if (builder.surveyQuery.isError || builder.definitionQuery.isError) {
    return (
      <Card className={pageTw.empty}>
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

  if (builder.survey.access.isCrossOrganizationPreview) {
    return (
      <Card className={pageTw.empty}>
        <div>
          <h2>Preview only for this survey</h2>
          <p>{builder.survey.access.message ?? "This survey belongs to another organization."}</p>
        </div>
        <div className={builderDialogActionsClassName}>
          <Button asChild size="sm" variant="secondary">
            <Link to="/app/surveys">Back to Surveys</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/app/surveys/${surveyId}/preview`}>Open Preview</Link>
          </Button>
        </div>
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
    <div className="grid gap-5">
      <header className="sticky top-4 z-10 flex items-center justify-between gap-3 rounded-app-lg border border-app-border [border-style:solid] bg-white/90 px-[22px] py-[18px] max-app-tablet:top-auto max-app-mobile:static max-app-mobile:flex-col max-app-mobile:items-stretch">
        <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/surveys">Surveys</Link>
          </Button>
          <div>
            <h1 className="mt-0 mb-2 text-[clamp(1.5rem,2vw,2rem)]">{readBuilderDisplayTitle(definition.version.title, DEFAULT_SURVEY_TITLE)}</h1>
            <div className="flex flex-wrap items-center justify-start gap-3 text-app-text-soft">
              <SurveyStatusBadge status={builder.survey.status} />
              <span>Version {definition.version.versionNumber}</span>
              <span aria-live="polite">{builder.saveMessage}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
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
                <AlertDialog.Overlay className={builderDialogOverlayClassName} />
                <AlertDialog.Content className={builderDialogClassName}>
                  <AlertDialog.Title>Publish survey</AlertDialog.Title>
                  <AlertDialog.Description className="m-0 text-app-text-soft">
                    Your survey will become available to respondents after the current draft is published.
                  </AlertDialog.Description>
                  <dl className="my-[18px] flex flex-wrap items-start justify-between gap-3 [&>div]:min-w-[140px] [&_dt]:mb-1 [&_dt]:text-[0.84rem] [&_dt]:text-app-text-faint [&_dd]:m-0">
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
                      <ul className="m-0 pl-[18px]">
                        {publishErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </InlineNotice>
                  ) : null}
                  <div className={builderDialogActionsClassName}>
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
          ) : builder.survey.access.canEdit ? (
               <Button
                 disabled={builder.createDraftMutation.isPending}
                 onClick={() => void builder.createDraftMutation.mutateAsync(undefined)}
                 size="sm"
               >
                 Create new draft version
             </Button>
          ) : null}
        </div>
      </header>

      {builder.survey.access.message ? (
        <InlineNotice>{builder.survey.access.message}</InlineNotice>
      ) : null}

      {!builder.isEditable && builder.survey.access.canEdit ? (
        <InlineNotice icon={<CheckCircle2 size={16} />}>
          This version is published and cannot be edited directly. Create a new draft version to continue editing.
        </InlineNotice>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-[18px]">
        <main className="grid min-w-0 gap-4 rounded-app-lg border border-[rgba(216,225,239,0.9)] [border-style:solid] bg-app-builder-workspace p-5 shadow-[0_24px_60px_rgba(18,48,79,0.08)] max-app-mobile:p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
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

          <div className="builder-section-tabs mb-2 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]" role="tablist" aria-label="Survey builder tabs">
            <button
              aria-selected={activeWorkspaceTab === SURVEY_TAB_ID}
              className={cn(workspaceTabClassName, activeWorkspaceTab === SURVEY_TAB_ID && workspaceTabActiveClassName)}
              onClick={() => setActiveWorkspaceTab(SURVEY_TAB_ID)}
              role="tab"
              title="Survey settings"
              type="button"
            >
              <strong className="text-app-text">Survey</strong>
              <div className={workspaceTabMetaClassName}>
                <span className="text-[0.92rem] text-app-text-soft">Title, description, access, theme</span>
                <span className={workspaceTabBadgeClassName}>Settings</span>
              </div>
            </button>
            <button
              aria-selected={activeWorkspaceTab === CALCULATED_SCORES_TAB_ID}
              className={cn(workspaceTabClassName, activeWorkspaceTab === CALCULATED_SCORES_TAB_ID && workspaceTabActiveClassName)}
              onClick={() => setActiveWorkspaceTab(CALCULATED_SCORES_TAB_ID)}
              role="tab"
              title="Manage calculated scores"
              type="button"
            >
              <strong className="text-app-text">Calculated Scores</strong>
              <div className={workspaceTabMetaClassName}>
                <span className="text-[0.92rem] text-app-text-soft">Thresholds, source questions, follow-up targets</span>
                <span className={workspaceTabBadgeClassName}>{definition.calculatedScores.length}</span>
              </div>
            </button>
            {orderedSections.map((section, index) => (
              (() => {
                const questionCount = definition.questions.filter((question) => question.sectionId === section.id).length;
                const conditions = sectionConditionsById.get(section.id) ?? [];

                return (
               <button
                aria-selected={activeWorkspaceTab === section.id}
                className={cn(workspaceTabClassName, activeWorkspaceTab === section.id && workspaceTabActiveClassName)}
                key={section.id}
                onClick={() => selectSectionTab(section.id)}
                role="tab"
                title={`${questionCount} questions`}
                type="button"
              >
                <div>
                  <strong className="text-app-text">
                    {index + 1}. {readBuilderDisplayTitle(section.title, DEFAULT_SECTION_TITLE)}
                  </strong>
                  <div className={workspaceTabMetaClassName}>
                    <span className="text-[0.92rem] text-app-text-soft">Section workspace</span>
                    <span className={workspaceTabBadgeClassName}>{questionCount}</span>
                  </div>
                  {conditions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-app-border-strong [border-style:solid] bg-app-primary-soft px-2.5 py-1 text-[0.8rem] font-bold text-app-primary-strong" title={conditions.map((item) => formatScoreCondition(item)).join(", ")}>
                        {conditions.length === 1 ? `Conditional: ${formatScoreCondition(conditions[0])}` : `Conditional: ${conditions.length} rules`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </button>
                );
              })()
            ))}
          </div>

          {activeWorkspaceTab === SURVEY_TAB_ID ? (
            <SettingsPanel builder={builder} mode="survey" />
          ) : activeWorkspaceTab === CALCULATED_SCORES_TAB_ID ? (
            <CalculatedScoresPanel builder={builder} />
          ) : activeSection ? (
            <section key={activeSection.id}>
              {(() => {
                const sectionQuestions = sortQuestions(
                  definition.questions.filter((question) => question.sectionId === activeSection.id)
                );
                const sectionIndex = orderedSections.findIndex((section) => section.id === activeSection.id);

                return (
                  <>
                <Card className="p-[18px] max-app-mobile:p-[18px]">
                  <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
                    <div>
                      <span className="mb-2 inline-block text-[0.82rem] font-bold text-app-primary uppercase">Section {sectionIndex + 1}</span>
                      <Input
                        onChange={(event) => builder.updateSection(activeSection.id, { title: event.target.value })}
                        placeholder={DEFAULT_SECTION_TITLE}
                        value={readBuilderFieldValue(activeSection.title, DEFAULT_SECTION_TITLE)}
                      />
                    </div>
                    {builder.isEditable ? (
                      <div className="flex items-center justify-between gap-3">
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
                    className={builderTextareaClassName}
                    onChange={(event) => builder.updateSection(activeSection.id, { description: event.target.value })}
                    placeholder="Optional section description"
                    rows={3}
                    value={activeSection.description ?? ""}
                  />
                </Card>

                <div className="grid gap-4">
                  {sectionQuestions.map((question) => (
                    <QuestionCard
                      builder={builder}
                      key={question.id}
                      question={question}
                      sectionIndex={sectionIndex}
                      usage={questionUsageById.get(question.id) ?? []}
                    />
                  ))}
                </div>

                {builder.isEditable ? (
                  <div className="flex items-center justify-center ">
                    <Button onClick={() => void builder.addQuestion(activeSection.id)} className="mt-2 bg-" size="sm" variant="secondary">
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
          <Dialog.Overlay className={builderDialogOverlayClassName} />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[46] grid max-h-[85vh] gap-3.5 overflow-auto rounded-t-app-md border border-app-border [border-style:solid] bg-white p-[18px] shadow-app">
            <Dialog.Title>Settings</Dialog.Title>
            <SettingsPanel builder={builder} mobile />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
