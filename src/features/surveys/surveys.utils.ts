import type {
  Question,
  QuestionOption,
  QuestionType,
  Survey,
  SurveyAccessMode,
  SurveyResponseSummary,
  SurveySection,
  SurveyVersion,
  SurveyVersionDefinition,
  SurveyVersionSettings
} from "./surveys.types";

export const defaultSurveyVersionSettings = (): SurveyVersionSettings => ({
  allowBackNavigation: true,
  confirmationMessage: "Your response has been submitted.",
  oneQuestionPerPage: false,
  redirectUrl: null,
  showConfirmationPage: true,
  showProgressBar: true,
  showQuestionNumbers: true,
  shuffleOptions: false,
  shuffleQuestions: false,
  theme: {
    logoUrl: null,
    primaryColor: "#184fbe"
  }
});

export const questionTypeLabels: Record<QuestionType, string> = {
  long_text: "Long text",
  multiple_choice: "Multiple choice",
  rating: "Rating",
  short_text: "Short text",
  single_choice: "Single choice",
  vote: "Vote",
  yes_no: "Yes / No"
};

export const accessModeLabels: Record<SurveyAccessMode, string> = {
  authenticated: "Authenticated users",
  invite_only: "Invitation only",
  organization_only: "Organization only",
  public: "Public link"
};

export const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

export const questionSupportsOptions = (questionType: QuestionType) =>
  questionType === "single_choice" ||
  questionType === "multiple_choice" ||
  questionType === "yes_no" ||
  questionType === "vote";

export const getQuestionOptions = (definition: SurveyVersionDefinition, questionId: string) =>
  definition.options
    .filter((option) => option.questionId === questionId)
    .sort((left, right) => left.position - right.position);

export const buildEmptyDraftDefinition = (
  surveyId: string,
  versionId: string,
  title: string,
  description: string | null
): SurveyVersionDefinition => ({
  calculatedScores: [],
  options: [],
  questions: [],
  sections: [],
  version: {
    archivedAt: null,
    changeSummary: null,
    createdAt: new Date().toISOString(),
    createdBy: "",
    createdFromVersionId: null,
    description,
    id: versionId,
    publishedAt: null,
    publishedBy: null,
    settings: defaultSurveyVersionSettings(),
    status: "draft",
    surveyId,
    title,
    updatedAt: new Date().toISOString(),
    versionNumber: 1
  }
});

export const sortSections = (sections: SurveySection[]) =>
  [...sections].sort((left, right) => left.position - right.position);

export const sortQuestions = (questions: Question[]) =>
  [...questions].sort((left, right) => left.position - right.position);

export const sortOptions = (options: QuestionOption[]) =>
  [...options].sort((left, right) => left.position - right.position);

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60]
  ];

  for (const [unit, amount] of intervals) {
    if (Math.abs(seconds) >= amount) {
      return formatter.format(Math.round(seconds / amount), unit);
    }
  }

  return formatter.format(seconds, "second");
};

export const totalResponses = (summary: SurveyResponseSummary | null) =>
  (summary?.submittedCount ?? 0) + (summary?.inProgressCount ?? 0);

export const syncQuestion = (questions: Question[], nextQuestion: Question) =>
  questions.map((question) => (question.id === nextQuestion.id ? nextQuestion : question));

export const syncOption = (options: QuestionOption[], nextOption: QuestionOption) =>
  options.map((option) => (option.id === nextOption.id ? nextOption : option));

export const syncSection = (sections: SurveySection[], nextSection: SurveySection) =>
  sections.map((section) => (section.id === nextSection.id ? nextSection : section));

export const readQuestionPlaceholder = (type: QuestionType) => {
  if (type === "long_text") {
    return "Long answer";
  }

  if (type === "rating") {
    return "1 to 5";
  }

  if (type === "yes_no") {
    return "Yes / No";
  }

  if (questionSupportsOptions(type)) {
    return "Choose an option";
  }

  return "Short answer";
};

export const ensureDateOrder = (opensAt: string | null, closesAt: string | null) => {
  if (!opensAt || !closesAt) {
    return true;
  }

  return new Date(closesAt).getTime() > new Date(opensAt).getTime();
};

export const defaultQuestionValidation = (type: QuestionType) => {
  if (type === "rating") {
    return { maximum: 5, minimum: 1, step: 1 };
  }

  if (type === "short_text" || type === "long_text") {
    return { maxLength: type === "long_text" ? 1000 : 255, minLength: 0, pattern: null };
  }

  if (type === "single_choice" || type === "yes_no" || type === "vote") {
    return { maximumSelections: 1, minimumSelections: 0 };
  }

  if (type === "multiple_choice") {
    return { maximumSelections: 5, minimumSelections: 0 };
  }

  return {};
};

export const mergeSurveyVersion = (
  version: SurveyVersion,
  patch: Partial<SurveyVersion>
): SurveyVersion => ({
  ...version,
  ...patch,
  settings: {
    ...version.settings,
    ...(patch.settings ?? {}),
    theme: {
      ...version.settings.theme,
      ...(patch.settings?.theme ?? {})
    }
  }
});

export const mergeSurvey = (survey: Survey, patch: Partial<Survey>) => ({
  ...survey,
  ...patch
});
