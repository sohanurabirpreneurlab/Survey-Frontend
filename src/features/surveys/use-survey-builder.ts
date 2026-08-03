import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../lib/api";
import { toast } from "../../state/toast-store";
import { useAuth } from "../auth/use-auth";
import {
  bulkUpdateOptionScoresRequest,
  closeSurveyRequest,
  createCalculatedScoreRequest,
  createDraftRequest,
  createOptionRequest,
  createQuestionRequest,
  createSectionRequest,
  deleteCalculatedScoreRequest,
  deleteOptionRequest,
  deleteQuestionRequest,
  deleteSectionRequest,
  getSurveyRequest,
  getSurveyVersionRequest,
  publishDraftRequest,
  reorderOptionsRequest,
  reorderQuestionsRequest,
  reorderSectionsRequest,
  reopenSurveyRequest,
  updateCalculatedScoreRequest,
  updateDraftRequest,
  updateOptionRequest,
  updateQuestionRequest,
  updateSectionRequest,
  updateSurveyRequest
} from "./surveys.api";
import { surveyKeys } from "./surveys.keys";
import {
  defaultQuestionValidation,
  getQuestionOptions,
  mergeSurvey,
  mergeSurveyVersion,
  questionSupportsOptions,
  sortOptions,
  sortQuestions,
  sortSections,
  syncOption,
  syncQuestion,
  syncSection
} from "./surveys.utils";
import type {
  CalculatedScoreCalculationType,
  CalculatedScoreTargetType,
  CalculatedScoreThresholdOperator,
  Question,
  QuestionOption,
  Survey,
  SurveySection,
  SurveyVersion,
  SurveyVersionDefinition,
  SurveyVersionSettings
} from "./surveys.types";

type SaveState = "failed" | "saved" | "saving" | "unsaved";
const BUILDER_AUTOSAVE_DELAY_MS = 2000;

const changeMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Your latest changes could not be saved.";
};

const mutationErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? Array.isArray(error.details) && error.details.length > 0
      ? error.details.map((detail) => detail.message).join(" ")
      : error.message
    : "Please try again.";

const pruneCalculatedScoresAfterQuestionRemoval = (
  calculatedScores: SurveyVersionDefinition["calculatedScores"],
  removedQuestionIds: string[],
  removedSectionIds: string[] = []
) => {
  const removedQuestionIdSet = new Set(removedQuestionIds);
  const removedSectionIdSet = new Set(removedSectionIds);

  return calculatedScores
    .map((score) => ({
      ...score,
      questions: score.questions.filter((question) => !removedQuestionIdSet.has(question.questionId)),
      targets: score.targets.filter((target) => {
        if (target.targetType === "question") {
          return !removedQuestionIdSet.has(target.targetId);
        }

        if (target.targetType === "section") {
          return !removedSectionIdSet.has(target.targetId);
        }

        return true;
      })
    }));
};

const reindexItems = <T extends { position: number }>(items: T[]) =>
  items.map((item, index) => ({ ...item, position: index }));

const createTempId = (prefix: string) =>
  `temp-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const buildOptionValue = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const useSurveyBuilder = (surveyId: string) => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [definition, setDefinition] = useState<SurveyVersionDefinition | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("Saved");
  const queueRef = useRef(Promise.resolve());
  const pendingTimersRef = useRef<Map<string, number>>(new Map());
  const pendingQuestionCreatesRef = useRef<Map<string, Promise<Question>>>(new Map());
  const pendingOptionCreatesRef = useRef<Map<string, Promise<QuestionOption>>>(new Map());
  const pendingQuestionEditsRef = useRef<Map<string, Question>>(new Map());
  const pendingOptionEditsRef = useRef<Map<string, QuestionOption>>(new Map());
  const bootstrappedEmptyStateRef = useRef(false);

  const token = auth.accessToken ?? "";

  const surveyQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSurveyRequest(token, surveyId),
    queryKey: surveyKeys.detail(surveyId)
  });

  const activeVersionId =
    surveyQuery.data?.currentDraftVersionId ?? surveyQuery.data?.publishedVersionId ?? null;

  const definitionQuery = useQuery({
    enabled: Boolean(token && activeVersionId),
    queryFn: () => getSurveyVersionRequest(token, surveyId, activeVersionId as string),
    queryKey: surveyKeys.draft(surveyId, activeVersionId ?? "missing")
  });

  const createDraftMutation = useMutation({
    mutationFn: (changeSummary?: string) => createDraftRequest(token, surveyId, changeSummary),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      toast.success("Draft ready", "A new editable draft was created from the published version.");
    }
  });

  const publishMutation = useMutation({
    mutationFn: () => publishDraftRequest(token, surveyId),
    onSuccess: async () => {
      toast.success("Survey published", "The current draft is now the published survey.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
        queryClient.invalidateQueries({ queryKey: surveyKeys.all })
      ]);
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => closeSurveyRequest(token, surveyId),
    onSuccess: (nextSurvey) => {
      setSurvey(nextSurvey);
      queryClient.setQueryData(surveyKeys.detail(surveyId), nextSurvey);
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all });
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenSurveyRequest(token, surveyId),
    onSuccess: (nextSurvey) => {
      setSurvey(nextSurvey);
      queryClient.setQueryData(surveyKeys.detail(surveyId), nextSurvey);
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all });
    }
  });

  useEffect(() => {
    if (!surveyQuery.data) {
      return;
    }

    setSurvey(surveyQuery.data);
  }, [surveyQuery.data]);

  useEffect(() => {
    if (definitionQuery.data) {
      setDefinition(definitionQuery.data);
    }
  }, [definitionQuery.data]);

  useEffect(() => {
    if (!definition) {
      return;
    }

    if (!selectedSectionId && definition.sections[0]) {
      setSelectedSectionId(definition.sections[0].id);
    }

    if (!selectedQuestionId && definition.questions[0]) {
      setSelectedQuestionId(definition.questions[0].id);
    }
  }, [definition, selectedQuestionId, selectedSectionId]);

  const isEditable = Boolean(
    survey?.access.canEdit && survey.currentDraftVersionId && definition?.version.status === "draft"
  );

  const flushPendingSaves = async () => {
    pendingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    pendingTimersRef.current.clear();
    await queueRef.current;
  };

  const enqueue = (task: () => Promise<void>, message = "Saved") => {
    setSaveState("saving");
    setSaveMessage("Saving...");
    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(task)
      .then(() => {
        if (pendingTimersRef.current.size === 0) {
          setSaveState("saved");
          setSaveMessage(message);
        } else {
          setSaveState("unsaved");
          setSaveMessage("Unsaved changes");
        }
      })
      .catch((error: unknown) => {
        setSaveState("failed");
        setSaveMessage(changeMessage(error));
        throw error;
      });

    return queueRef.current;
  };

  const schedule = (key: string, task: () => Promise<void>, delay = BUILDER_AUTOSAVE_DELAY_MS) => {
    const currentTimer = pendingTimersRef.current.get(key);

    if (currentTimer) {
      window.clearTimeout(currentTimer);
    }

    setSaveState("unsaved");
    setSaveMessage("Unsaved changes");

    const nextTimer = window.setTimeout(() => {
      pendingTimersRef.current.delete(key);
      void enqueue(task);
    }, delay);

    pendingTimersRef.current.set(key, nextTimer);
  };

  const shouldApplyServerEcho = (key: string) => !pendingTimersRef.current.has(key);

  const cancelPendingSave = (key: string) => {
    const timerId = pendingTimersRef.current.get(key);

    if (timerId) {
      window.clearTimeout(timerId);
      pendingTimersRef.current.delete(key);
    }
  };

  const syncDefinitionVersion = (nextVersion: SurveyVersion) => {
    setDefinition((current) =>
      current
        ? {
            ...current,
            version: nextVersion
          }
        : current
    );
  };

  const syncSurveyCache = (nextSurvey: Survey) => {
    setSurvey(nextSurvey);
    queryClient.setQueryData(surveyKeys.detail(surveyId), nextSurvey);
  };

  const updateSurveyFields = (patch: Partial<Survey>) => {
    if (!survey?.access.canEdit) {
      return;
    }

    setSurvey((current) => (current ? mergeSurvey(current, patch) : current));
    const nextSurvey = survey ? mergeSurvey(survey, patch) : null;

    if (!nextSurvey) {
      return;
    }

    schedule("survey-metadata", async () => {
      const saved = await updateSurveyRequest(token, surveyId, {
        accessMode: nextSurvey.accessMode,
        closesAt: nextSurvey.closesAt,
        opensAt: nextSurvey.opensAt,
        responseLimit: nextSurvey.responseLimit,
        slug: nextSurvey.slug
      });

      if (shouldApplyServerEcho("survey-metadata")) {
        syncSurveyCache(saved);
      }
    }, BUILDER_AUTOSAVE_DELAY_MS);
  };

  const updateDraftFields = (patch: Partial<SurveyVersion> & { settings?: Partial<SurveyVersionSettings> }) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const nextVersion = mergeSurveyVersion(definition.version, patch);
    setDefinition({
      ...definition,
      version: nextVersion
    });

    if (!nextVersion.title.trim()) {
      return;
    }

    schedule("draft-version", async () => {
      const saved = await updateDraftRequest(token, surveyId, {
        changeSummary: nextVersion.changeSummary,
        description: nextVersion.description,
        settings: nextVersion.settings,
        title: nextVersion.title
      });

      if (shouldApplyServerEcho("draft-version")) {
        syncDefinitionVersion(saved);
      }
    }, BUILDER_AUTOSAVE_DELAY_MS);
  };

  const addSection = async () => {
    if (!definition || !isEditable) {
      return;
    }

    const tempId = createTempId("section");
    const optimisticSection: SurveySection = {
      createdAt: new Date().toISOString(),
      description: null,
      id: tempId,
      position: definition.sections.length,
      stableKey: tempId,
      surveyVersionId: definition.version.id,
      title: "Untitled section",
      updatedAt: new Date().toISOString()
    };

    setDefinition({
      ...definition,
      sections: [...definition.sections, optimisticSection]
    });
    setSelectedSectionId(tempId);
    setSelectedQuestionId(null);

    try {
      const section = await createSectionRequest(token, surveyId, {
        description: null,
        position: definition.sections.length,
        title: "Untitled section"
      });

      setDefinition((current) =>
        current
          ? {
              ...current,
              sections: current.sections.map((item) => (item.id === tempId ? section : item))
            }
          : current
      );
      setSelectedSectionId((current) => (current === tempId ? section.id : current));
      toast.success("Section created", "A new section was added to the draft.");
      return section;
    } catch (error) {
      console.log('error:',error);
      
      setDefinition((current) =>
        current
          ? {
              ...current,
              sections: current.sections.filter((item) => item.id !== tempId)
            }
          : current
      );
      setSelectedSectionId((current) => (current === tempId ? null : current));
      setSaveState("failed");
      setSaveMessage(changeMessage(error));
      toast.danger("Create section failed", mutationErrorMessage(error));
      throw error;
    }
  };

  const updateSection = (sectionId: string, patch: Partial<SurveySection>) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const currentSection = definition.sections.find((section) => section.id === sectionId);

    if (!currentSection) {
      return;
    }

    const nextSection = { ...currentSection, ...patch };
    setDefinition({
      ...definition,
      sections: syncSection(definition.sections, nextSection)
    });

    if (!nextSection.title.trim()) {
      return;
    }

    schedule(`section:${sectionId}`, async () => {
      const saved = await updateSectionRequest(token, surveyId, sectionId, {
        description: nextSection.description,
        position: nextSection.position,
        title: nextSection.title
      });

      if (!shouldApplyServerEcho(`section:${sectionId}`)) {
        return;
      }

      setDefinition((current) =>
        current
          ? {
              ...current,
              sections: syncSection(current.sections, saved)
            }
          : current
      );
    }, BUILDER_AUTOSAVE_DELAY_MS);
  };

  const deleteSection = async (sectionId: string) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    try {
      await deleteSectionRequest(token, surveyId, sectionId);
      const remainingQuestions = definition.questions.filter((question) => question.sectionId !== sectionId);
      const remainingQuestionIds = new Set(remainingQuestions.map((question) => question.id));
      setDefinition({
        ...definition,
        calculatedScores: pruneCalculatedScoresAfterQuestionRemoval(
          definition.calculatedScores,
          definition.questions.filter((question) => question.sectionId === sectionId).map((question) => question.id),
          [sectionId]
        ),
        options: definition.options.filter((option) => remainingQuestionIds.has(option.questionId)),
        questions: remainingQuestions,
        sections: definition.sections.filter((section) => section.id !== sectionId)
      });
      setSelectedSectionId((current) => (current === sectionId ? null : current));
      setSelectedQuestionId((current) =>
        definition.questions.some((question) => question.sectionId === sectionId && question.id === current)
          ? null
          : current
      );
      toast.success("Section deleted", "The section and its questions were removed from the draft.");
    } catch (error) {
      toast.danger("Delete section failed", mutationErrorMessage(error));
      throw error;
    }
  };

  const moveSection = async (sectionId: string, direction: -1 | 1) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const sections = sortSections(definition.sections);
    const currentIndex = sections.findIndex((section) => section.id === sectionId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sections.length) {
      return;
    }

    const reordered = [...sections];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    const normalized = reindexItems(reordered);

    setDefinition({
      ...definition,
      sections: normalized
    });

    await enqueue(async () => {
      const saved = await reorderSectionsRequest(
        token,
        surveyId,
        normalized.map((section) => ({ position: section.position, sectionId: section.id }))
      );
      setDefinition((current) => (current ? { ...current, sections: sortSections(saved) } : current));
    });
  };

  const addQuestion = async (sectionId: string) => {
    if (!definition || !isEditable) {
      return;
    }

    const sectionQuestions = definition.questions.filter((question) => question.sectionId === sectionId);
    const type: Question["type"] = "short_text";
    const tempId = createTempId("question");
    const optimisticQuestion: Question = {
      createdAt: new Date().toISOString(),
      description: null,
      displayLogic: {},
      id: tempId,
      position: sectionQuestions.length,
      required: false,
      sectionId,
      settings: {},
      stableKey: tempId,
      surveyVersionId: definition.version.id,
      title: "Untitled question",
      type,
      updatedAt: new Date().toISOString(),
      validation: defaultQuestionValidation(type)
    };

    setDefinition({
      ...definition,
      questions: [...definition.questions, optimisticQuestion]
    });
    pendingQuestionEditsRef.current.set(tempId, optimisticQuestion);
    setSelectedSectionId(sectionId);
    setSelectedQuestionId(tempId);

    const createRequest = createQuestionRequest(token, surveyId, {
        description: null,
        displayLogic: {},
        options: [],
        position: sectionQuestions.length,
        required: false,
        sectionId,
        settings: {},
        title: "Untitled question",
        type,
        validation: defaultQuestionValidation(type)
      });
    pendingQuestionCreatesRef.current.set(tempId, createRequest);

    try {
      const question = await createRequest;
      const localQuestion = pendingQuestionEditsRef.current.get(tempId);
      const reconciledQuestion: Question = localQuestion
        ? {
            ...question,
            ...localQuestion,
            createdAt: question.createdAt,
            id: question.id,
            stableKey: question.stableKey,
            surveyVersionId: question.surveyVersionId,
            updatedAt: question.updatedAt
          }
        : question;

      cancelPendingSave(`question:${tempId}`);

      setDefinition((current) =>
        current
          ? {
              ...current,
              options: current.options.map((option) =>
                option.questionId === tempId ? { ...option, questionId: question.id } : option
              ),
              questions: current.questions.map((item) =>
                item.id === tempId ? reconciledQuestion : item
              )
            }
          : current
      );
      pendingQuestionEditsRef.current.delete(tempId);
      setSelectedQuestionId((current) => (current === tempId ? question.id : current));

      void enqueue(async () => {
        const saved = await updateQuestionRequest(token, surveyId, question.id, {
          description: reconciledQuestion.description,
          displayLogic: reconciledQuestion.displayLogic,
          position: reconciledQuestion.position,
          required: reconciledQuestion.required,
          settings: reconciledQuestion.settings,
          title: reconciledQuestion.title,
          type: reconciledQuestion.type,
          validation: reconciledQuestion.validation
        });

        if (shouldApplyServerEcho(`question:${question.id}`)) {
          setDefinition((current) =>
            current ? { ...current, questions: syncQuestion(current.questions, saved) } : current
          );
        }
      }).catch((error: unknown) => {
        toast.danger("Save question failed", mutationErrorMessage(error));
      });

      toast.success("Question created", "A new question was added to the section.");
      return question;
    } catch (error) {
      setDefinition((current) =>
        current
          ? {
              ...current,
              questions: current.questions.filter((item) => item.id !== tempId)
            }
          : current
      );
      setSelectedQuestionId((current) => (current === tempId ? null : current));
      pendingQuestionEditsRef.current.delete(tempId);
      setSaveState("failed");
      setSaveMessage(changeMessage(error));
      toast.danger("Create question failed", mutationErrorMessage(error));
      throw error;
    } finally {
      pendingQuestionCreatesRef.current.delete(tempId);
    }
  };

  const updateQuestion = (
    questionId: string,
    patch: Partial<Question>,
    options?: { confirmRemoveOptions?: boolean }
  ) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const currentQuestion = definition.questions.find((question) => question.id === questionId);

    if (!currentQuestion) {
      return;
    }

    const nextQuestion = { ...currentQuestion, ...patch };
    let nextOptions = definition.options;

    if (
      patch.type &&
      patch.type !== currentQuestion.type &&
      !questionSupportsOptions(patch.type) &&
      getQuestionOptions(definition, questionId).length > 0
    ) {
      nextOptions = definition.options.filter((option) => option.questionId !== questionId);
    }

    setDefinition({
      ...definition,
      options: nextOptions,
      questions: syncQuestion(definition.questions, nextQuestion)
    });

    if (questionId.startsWith("temp-question-")) {
      pendingQuestionEditsRef.current.set(questionId, nextQuestion);
      return;
    }

    if (!nextQuestion.title.trim()) {
      return;
    }

    schedule(`question:${questionId}`, async () => {
      const saved = await updateQuestionRequest(token, surveyId, questionId, {
        confirmRemoveOptions: options?.confirmRemoveOptions,
        description: nextQuestion.description,
        displayLogic: nextQuestion.displayLogic,
        position: nextQuestion.position,
        required: nextQuestion.required,
        settings: nextQuestion.settings,
        title: nextQuestion.title,
        type: nextQuestion.type,
        validation: nextQuestion.validation
      });

      if (!shouldApplyServerEcho(`question:${questionId}`)) {
        return;
      }

      setDefinition((current) =>
        current
          ? {
              ...current,
              questions: syncQuestion(current.questions, saved)
            }
          : current
      );
    }, BUILDER_AUTOSAVE_DELAY_MS);
  };

  const deleteQuestion = async (questionId: string) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    try {
      await deleteQuestionRequest(token, surveyId, questionId);
      setDefinition({
        ...definition,
        calculatedScores: pruneCalculatedScoresAfterQuestionRemoval(definition.calculatedScores, [questionId]),
        options: definition.options.filter((option) => option.questionId !== questionId),
        questions: definition.questions.filter((question) => question.id !== questionId)
      });
      setSelectedQuestionId((current) => (current === questionId ? null : current));
      toast.success("Question deleted", "The question and its options were removed from the draft.");
    } catch (error) {
      toast.danger("Delete question failed", mutationErrorMessage(error));
      throw error;
    }
  };

  const moveQuestion = async (questionId: string, direction: -1 | 1) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const targetQuestion = definition.questions.find((question) => question.id === questionId);

    if (!targetQuestion) {
      return;
    }

    const sectionQuestions = sortQuestions(
      definition.questions.filter((question) => question.sectionId === targetQuestion.sectionId)
    );
    const currentIndex = sectionQuestions.findIndex((question) => question.id === questionId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sectionQuestions.length) {
      return;
    }

    const reordered = [...sectionQuestions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    const normalized = reindexItems(reordered);

    setDefinition({
      ...definition,
      questions: definition.questions.map((question) => {
        const updated = normalized.find((item) => item.id === question.id);
        return updated ?? question;
      })
    });

    await enqueue(async () => {
      const saved = await reorderQuestionsRequest(
        token,
        surveyId,
        targetQuestion.sectionId,
        normalized.map((question) => ({ position: question.position, questionId: question.id }))
      );
      setDefinition((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((question) => saved.find((item) => item.id === question.id) ?? question)
            }
          : current
      );
    });
  };

  const addOption = async (questionId: string) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const currentOptions = getQuestionOptions(definition, questionId);
    const tempId = createTempId("option");
    const optimisticOption: QuestionOption = {
      createdAt: new Date().toISOString(),
      id: tempId,
      label: "",
      position: currentOptions.length,
      questionId,
      scoreValue: null,
      settings: {},
      stableKey: tempId,
      updatedAt: new Date().toISOString(),
      value: ""
    };

    setDefinition((current) =>
      current ? { ...current, options: [...current.options, optimisticOption] } : current
    );
    pendingOptionEditsRef.current.set(tempId, optimisticOption);
    toast.success("Option added", "Enter a label to save this option.");
  };

  const persistTempOption = async (questionId: string, optionDraft: QuestionOption) => {
    const optionId = optionDraft.id;
    const trimmedLabel = optionDraft.label.trim();

    if (!optionId.startsWith("temp-option-") || !trimmedLabel || pendingOptionCreatesRef.current.has(optionId)) {
      return;
    }

    const createRequest = (async () => {
      const pendingQuestion = pendingQuestionCreatesRef.current.get(questionId);
      const persistedQuestionId = pendingQuestion ? (await pendingQuestion).id : questionId;
      const option = await createOptionRequest(token, surveyId, persistedQuestionId, {
        label: trimmedLabel,
        position: optionDraft.position,
        settings: optionDraft.settings,
        value: optionDraft.value.trim() || buildOptionValue(trimmedLabel)
      });
      const localOption = pendingOptionEditsRef.current.get(optionId);
      const reconciledOption: QuestionOption = localOption
        ? {
            ...option,
            ...localOption,
            createdAt: option.createdAt,
            id: option.id,
            questionId: persistedQuestionId,
            stableKey: option.stableKey,
            updatedAt: option.updatedAt,
            value: localOption.value.trim() || buildOptionValue(localOption.label)
          }
        : option;

      cancelPendingSave(`option:${optionId}`);

      setDefinition((current) =>
        current
          ? {
              ...current,
              options: current.options.map((item) => (item.id === optionId ? reconciledOption : item))
            }
          : current
      );
      pendingOptionEditsRef.current.delete(optionId);

      void enqueue(async () => {
        const saved = await updateOptionRequest(token, surveyId, persistedQuestionId, option.id, {
          label: reconciledOption.label.trim(),
          position: reconciledOption.position,
          scoreValue: reconciledOption.scoreValue,
          settings: reconciledOption.settings,
          value: reconciledOption.value.trim() || buildOptionValue(reconciledOption.label)
        });

        if (shouldApplyServerEcho(`option:${option.id}`)) {
          setDefinition((current) =>
            current ? { ...current, options: syncOption(current.options, saved) } : current
          );
        }
      }).catch((error: unknown) => {
        toast.danger("Save option failed", mutationErrorMessage(error));
      });

      toast.success("Option created", "A new answer option was added.");
      return option;
    })();

    pendingOptionCreatesRef.current.set(optionId, createRequest);

    try {
      await createRequest;
    } catch (error) {
      cancelPendingSave(`option:${optionId}`);
      setDefinition((current) =>
        current
          ? { ...current, options: current.options.filter((option) => option.id !== optionId) }
          : current
      );
      pendingOptionEditsRef.current.delete(optionId);
      toast.danger("Create option failed", mutationErrorMessage(error));
      throw error;
    } finally {
      pendingOptionCreatesRef.current.delete(optionId);
    }
  };

  const updateOption = (questionId: string, optionId: string, patch: Partial<QuestionOption>) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const currentOption = definition.options.find((option) => option.id === optionId);

    if (!currentOption) {
      return;
    }

    const nextOption = { ...currentOption, ...patch };
    setDefinition({
      ...definition,
      options: syncOption(definition.options, nextOption)
    });

    if (optionId.startsWith("temp-option-")) {
      pendingOptionEditsRef.current.set(optionId, nextOption);
      if (nextOption.label.trim()) {
        void persistTempOption(questionId, nextOption);
      }
      return;
    }

    schedule(`option:${optionId}`, async () => {
      const saved = await updateOptionRequest(token, surveyId, questionId, optionId, {
        label: nextOption.label.trim(),
        position: nextOption.position,
        scoreValue: nextOption.scoreValue,
        settings: nextOption.settings,
        value: nextOption.value.trim() || buildOptionValue(nextOption.label)
      });

      if (!shouldApplyServerEcho(`option:${optionId}`)) {
        return;
      }

      setDefinition((current) =>
        current
          ? {
              ...current,
              options: syncOption(current.options, saved)
            }
          : current
      );
    }, BUILDER_AUTOSAVE_DELAY_MS);
  };

  const updateOptionScores = async (
    questionId: string,
    items: Array<{
      optionId: string;
      scoreValue: number | null;
    }>
  ) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const nextOptions = definition.options.map((option) => {
      const match = items.find((item) => item.optionId === option.id);
      return match ? { ...option, scoreValue: match.scoreValue } : option;
    });

    setDefinition((current) =>
      current
        ? {
            ...current,
            options: current.options.map((option) => {
              const match = items.find((item) => item.optionId === option.id);
              return match ? { ...option, scoreValue: match.scoreValue } : option;
            })
          }
        : current
    );

    schedule(`option-scores:${questionId}`, async () => {
      try {
        const currentQuestionOptions = getQuestionOptions(
          {
            ...definition,
            options: nextOptions
          },
          questionId
        );

        const saved = await bulkUpdateOptionScoresRequest(token, surveyId, questionId, {
          options: currentQuestionOptions.map((option) => ({
            optionId: option.id,
            scoreValue: option.scoreValue
          }))
        });

        if (!shouldApplyServerEcho(`option-scores:${questionId}`)) {
          return;
        }

        setDefinition((current) =>
          current
            ? {
                ...current,
                options: current.options.map((option) => saved.find((item) => item.id === option.id) ?? option)
              }
            : current
        );
      } catch (error) {
        toast.danger("Save numeric scoring failed", mutationErrorMessage(error));
        throw error;
      }
    });
  };

  const deleteOption = async (questionId: string, optionId: string) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    if (optionId.startsWith("temp-option-")) {
      pendingOptionEditsRef.current.delete(optionId);
      pendingOptionCreatesRef.current.delete(optionId);
      cancelPendingSave(`option:${optionId}`);
      setDefinition({
        ...definition,
        options: definition.options.filter((option) => option.id !== optionId)
      });
      toast.success("Option deleted", "The answer option was removed.");
      return;
    }

    try {
      await deleteOptionRequest(token, surveyId, questionId, optionId);
      setDefinition({
        ...definition,
        options: definition.options.filter((option) => option.id !== optionId)
      });
      toast.success("Option deleted", "The answer option was removed.");
    } catch (error) {
      toast.danger("Delete option failed", mutationErrorMessage(error));
      throw error;
    }
  };

  const moveOption = async (questionId: string, optionId: string, direction: -1 | 1) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    const questionOptions = sortOptions(getQuestionOptions(definition, questionId));
    const currentIndex = questionOptions.findIndex((option) => option.id === optionId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= questionOptions.length) {
      return;
    }

    const reordered = [...questionOptions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    const normalized = reindexItems(reordered);

    setDefinition({
      ...definition,
      options: definition.options.map((option) => normalized.find((item) => item.id === option.id) ?? option)
    });

    await enqueue(async () => {
      const saved = await reorderOptionsRequest(
        token,
        surveyId,
        questionId,
        normalized.map((option) => ({ optionId: option.id, position: option.position }))
      );
      setDefinition((current) =>
        current
          ? {
              ...current,
              options: current.options.map((option) => saved.find((item) => item.id === option.id) ?? option)
            }
          : current
      );
    });
  };

  const upsertCalculatedScore = async (
    calculatedScoreId: string | null,
    payload: {
      calculationType: CalculatedScoreCalculationType;
      decimalPlaces: number;
      key: string;
      name: string;
      requireAllAnswers: boolean;
      sourceQuestionIds: string[];
      targets: Array<{
        targetId: string;
        targetType: CalculatedScoreTargetType;
      }>;
      thresholdOperator: CalculatedScoreThresholdOperator;
      thresholdValue: number;
    }
  ) => {
    if (!definition || !survey?.access.canEdit) {
      return null;
    }

    try {
      const saved = calculatedScoreId
        ? await updateCalculatedScoreRequest(token, surveyId, calculatedScoreId, payload)
        : await createCalculatedScoreRequest(token, surveyId, payload);

      setDefinition((current) =>
        current
          ? {
              ...current,
              calculatedScores: calculatedScoreId
                ? current.calculatedScores.map((score) => (score.id === saved.id ? saved : score))
                : [...current.calculatedScores, saved]
            }
          : current
      );

      if (!calculatedScoreId) {
        toast.success("Score rule created", "A new calculated score rule was added.");
      }

      return saved;
    } catch (error) {
      if (!calculatedScoreId) {
        toast.danger("Create score rule failed", mutationErrorMessage(error));
      }

      throw error;
    }
  };

  const deleteCalculatedScore = async (calculatedScoreId: string) => {
    if (!definition || !survey?.access.canEdit) {
      return;
    }

    try {
      await deleteCalculatedScoreRequest(token, surveyId, calculatedScoreId);
      setDefinition((current) =>
        current
          ? {
              ...current,
              calculatedScores: current.calculatedScores.filter((score) => score.id !== calculatedScoreId)
            }
          : current
      );
      toast.success("Score rule deleted", "The calculated score rule was removed.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDefinition((current) =>
          current
            ? {
                ...current,
                calculatedScores: current.calculatedScores.filter((score) => score.id !== calculatedScoreId)
              }
            : current
        );
        toast.success("Score rule removed", "The calculated score rule had already been cleaned up.");
        return;
      }

      toast.danger("Delete score rule failed", mutationErrorMessage(error));
      throw error;
    }
  };

  useEffect(() => {
    if (
      !definition ||
      !survey ||
      !isEditable ||
      !definitionQuery.data ||
      bootstrappedEmptyStateRef.current
    ) {
      return;
    }

    if (definition.sections.length > 0) {
      bootstrappedEmptyStateRef.current = true;
      return;
    }

    bootstrappedEmptyStateRef.current = true;
    void addSection();
  }, [definition, definitionQuery.data, isEditable, survey]);

  const selectedQuestion = useMemo(
    () => definition?.questions.find((question) => question.id === selectedQuestionId) ?? null,
    [definition, selectedQuestionId]
  );

  const selectedSection = useMemo(
    () => definition?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [definition, selectedSectionId]
  );

  return {
    addOption,
    addQuestion,
    addSection,
    closeMutation,
    createDraftMutation,
    deleteCalculatedScore,
    definition,
    definitionQuery,
    deleteOption,
    deleteQuestion,
    deleteSection,
    flushPendingSaves,
    isEditable,
    moveOption,
    moveQuestion,
    moveSection,
    publishMutation,
    reopenMutation,
    saveMessage,
    saveState,
    selectedQuestion,
    selectedQuestionId,
    selectedSection,
    selectedSectionId,
    setSelectedQuestionId,
    setSelectedSectionId,
    survey,
    surveyQuery,
    updateDraftFields,
    updateOption,
    updateOptionScores,
    updateQuestion,
    updateSection,
    updateSurveyFields,
    upsertCalculatedScore
  };
};
