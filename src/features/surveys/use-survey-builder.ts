import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../lib/api";
import { toast } from "../../state/toast-store";
import { useAuth } from "../auth/use-auth";
import {
  closeSurveyRequest,
  createDraftRequest,
  createOptionRequest,
  createQuestionRequest,
  createSectionRequest,
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
  updateDraftRequest,
  updateOptionRequest,
  updateQuestionRequest,
  updateSectionRequest,
  updateSurveyRequest
} from "./surveys.api";
import { surveyKeys } from "./surveys.keys";
import {
  buildEmptyDraftDefinition,
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

const reindexItems = <T extends { position: number }>(items: T[]) =>
  items.map((item, index) => ({ ...item, position: index }));

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
      return;
    }

    if (!surveyQuery.data || !activeVersionId) {
      return;
    }

    const emptyDefinition = buildEmptyDraftDefinition(
      surveyQuery.data.id,
      activeVersionId,
      "Untitled survey",
      null
    );
    setDefinition(emptyDefinition);
  }, [activeVersionId, definitionQuery.data, surveyQuery.data]);

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

  const isEditable = Boolean(survey?.currentDraftVersionId && definition?.version.status === "draft");

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
    if (!definition) {
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

    const section = await createSectionRequest(token, surveyId, {
      description: null,
      position: definition.sections.length,
      title: "Untitled section"
    });
    setDefinition({
      ...definition,
      sections: [...definition.sections, section]
    });
    setSelectedSectionId(section.id);
    setSelectedQuestionId(null);
    return section;
  };

  const updateSection = (sectionId: string, patch: Partial<SurveySection>) => {
    if (!definition) {
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
    if (!definition) {
      return;
    }

    await deleteSectionRequest(token, surveyId, sectionId);
    const remainingQuestions = definition.questions.filter((question) => question.sectionId !== sectionId);
    const remainingQuestionIds = new Set(remainingQuestions.map((question) => question.id));
    setDefinition({
      ...definition,
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
  };

  const moveSection = async (sectionId: string, direction: -1 | 1) => {
    if (!definition) {
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
    const question = await createQuestionRequest(token, surveyId, {
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

    setDefinition({
      ...definition,
      questions: [...definition.questions, question]
    });
    setSelectedSectionId(sectionId);
    setSelectedQuestionId(question.id);
  };

  const updateQuestion = (
    questionId: string,
    patch: Partial<Question>,
    options?: { confirmRemoveOptions?: boolean }
  ) => {
    if (!definition) {
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
    if (!definition) {
      return;
    }

    await deleteQuestionRequest(token, surveyId, questionId);
    setDefinition({
      ...definition,
      options: definition.options.filter((option) => option.questionId !== questionId),
      questions: definition.questions.filter((question) => question.id !== questionId)
    });
    setSelectedQuestionId((current) => (current === questionId ? null : current));
  };

  const moveQuestion = async (questionId: string, direction: -1 | 1) => {
    if (!definition) {
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
    if (!definition) {
      return;
    }

    const currentOptions = getQuestionOptions(definition, questionId);
    const index = currentOptions.length + 1;
    const option = await createOptionRequest(token, surveyId, questionId, {
      label: `Option ${index}`,
      position: currentOptions.length,
      settings: {},
      value: `option_${index}`
    });

    setDefinition({
      ...definition,
      options: [...definition.options, option]
    });
  };

  const updateOption = (questionId: string, optionId: string, patch: Partial<QuestionOption>) => {
    if (!definition) {
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

    schedule(`option:${optionId}`, async () => {
      const saved = await updateOptionRequest(token, surveyId, questionId, optionId, {
        label: nextOption.label,
        position: nextOption.position,
        settings: nextOption.settings,
        value: nextOption.value
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

  const deleteOption = async (questionId: string, optionId: string) => {
    if (!definition) {
      return;
    }

    await deleteOptionRequest(token, surveyId, questionId, optionId);
    setDefinition({
      ...definition,
      options: definition.options.filter((option) => option.id !== optionId)
    });
  };

  const moveOption = async (questionId: string, optionId: string, direction: -1 | 1) => {
    if (!definition) {
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

  useEffect(() => {
    if (!definition || !survey || !isEditable || bootstrappedEmptyStateRef.current) {
      return;
    }

    if (definition.sections.length > 0) {
      bootstrappedEmptyStateRef.current = true;
      return;
    }

    bootstrappedEmptyStateRef.current = true;
    void addSection();
  }, [definition, isEditable, survey]);

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
    updateQuestion,
    updateSection,
    updateSurveyFields
  };
};
