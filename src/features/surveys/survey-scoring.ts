import type {
  CalculatedScoreThresholdOperator,
  Question,
  QuestionOption,
  SurveyCalculatedScore,
  SurveySection,
  SurveyVersionDefinition
} from "./surveys.types";

export const eligibleScoredQuestionTypes = new Set<Question["type"]>(["rating", "single_choice", "vote"]);

export const isScoringEligibleQuestion = (question: Question) => eligibleScoredQuestionTypes.has(question.type);

export const isQuestionScoringEnabled = (question: Question, options: QuestionOption[]) => {
  if (!isScoringEligibleQuestion(question)) {
    return false;
  }

  if (question.type === "rating") {
    return question.settings.scoringEnabled !== false;
  }

  return question.settings.scoringEnabled === true || options.some((option) => option.scoreValue !== null);
};

export const getQuestionScoreRange = (question: Question, options: QuestionOption[]) => {
  if (!isQuestionScoringEnabled(question, options)) {
    return null;
  }

  if (question.type === "rating") {
    const minimum = Number(question.validation.minimum ?? 1);
    const maximum = Number(question.validation.maximum ?? 5);
    return Number.isFinite(minimum) && Number.isFinite(maximum) ? { maximum, minimum } : null;
  }

  const numericScores = options
    .map((option) => option.scoreValue)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numericScores.length === 0) {
    return null;
  }

  return {
    maximum: Math.max(...numericScores),
    minimum: Math.min(...numericScores)
  };
};

export const buildQuestionUsageById = (calculatedScores: SurveyCalculatedScore[]) => {
  const usage = new Map<
    string,
    Array<{
      id: string;
      key: string;
      name: string;
      thresholdOperator: CalculatedScoreThresholdOperator;
      thresholdValue: number;
    }>
  >();

  for (const score of calculatedScores) {
    for (const sourceQuestion of score.questions) {
      const items = usage.get(sourceQuestion.questionId) ?? [];
      items.push({
        id: score.id,
        key: score.key,
        name: score.name,
        thresholdOperator: score.thresholdOperator,
        thresholdValue: score.thresholdValue
      });
      usage.set(sourceQuestion.questionId, items);
    }
  }

  return usage;
};

export const buildSectionConditionsById = (calculatedScores: SurveyCalculatedScore[]) => {
  const conditions = new Map<
    string,
    Array<{
      id: string;
      key: string;
      name: string;
      thresholdOperator: CalculatedScoreThresholdOperator;
      thresholdValue: number;
    }>
  >();

  for (const score of calculatedScores) {
    for (const target of score.targets) {
      if (target.targetType !== "section") {
        continue;
      }

      const items = conditions.get(target.targetId) ?? [];
      items.push({
        id: score.id,
        key: score.key,
        name: score.name,
        thresholdOperator: score.thresholdOperator,
        thresholdValue: score.thresholdValue
      });
      conditions.set(target.targetId, items);
    }
  }

  return conditions;
};

const formatOperator = (operator: CalculatedScoreThresholdOperator) => {
  switch (operator) {
    case "less_than":
      return "<";
    case "less_than_or_equal":
      return "<=";
    case "equal":
      return "=";
    case "greater_than_or_equal":
      return ">=";
    case "greater_than":
      return ">";
    default:
      return operator;
  }
};

export const formatScoreCondition = (score: {
  key?: string;
  name: string;
  thresholdOperator: CalculatedScoreThresholdOperator;
  thresholdValue: number;
}) => `${score.key ?? score.name} ${formatOperator(score.thresholdOperator)} ${score.thresholdValue}`;

export const validateCalculatedScoreDraft = (input: {
  definition: SurveyVersionDefinition;
  draft: {
    key: string;
    name: string;
    sourceQuestionIds: string[];
    targets: Array<{ targetId: string; targetType: "question" | "section" }>;
    thresholdValue: number;
  };
  existingScoreId?: string | null;
}) => {
  const errors: string[] = [];
  const { definition, draft } = input;

  if (!draft.name.trim()) {
    errors.push("Score name is required.");
  }

  if (!draft.key.trim()) {
    errors.push("Internal key is required.");
  } else if (!/^[A-Z0-9_]+$/.test(draft.key.trim())) {
    errors.push("Internal key may only contain uppercase letters, numbers, and underscores.");
  }

  if (draft.sourceQuestionIds.length === 0) {
    errors.push("Select at least one source question.");
  }

  const sourceQuestions = draft.sourceQuestionIds
    .map((questionId) => definition.questions.find((question) => question.id === questionId))
    .filter((question): question is Question => Boolean(question));

  for (const question of sourceQuestions) {
    const options = definition.options.filter((option) => option.questionId === question.id);
    if (!isQuestionScoringEnabled(question, options)) {
      errors.push(`"${question.title}" is not currently configured for scoring.`);
    }
  }

  const ranges = sourceQuestions
    .map((question) => ({
      question,
      range: getQuestionScoreRange(question, definition.options.filter((option) => option.questionId === question.id))
    }))
    .filter((item) => item.range !== null);

  if (ranges.length > 1) {
    const baseRange = `${ranges[0].range!.minimum}-${ranges[0].range!.maximum}`;
    const mismatch = ranges.find((item) => `${item.range!.minimum}-${item.range!.maximum}` !== baseRange);
    if (mismatch) {
      errors.push("Selected questions cannot be averaged because they use different score ranges.");
    }
  }

  if (!Number.isFinite(draft.thresholdValue)) {
    errors.push("Threshold value must be numeric.");
  }

  if (draft.targets.length === 0) {
    errors.push("Select at least one follow-up target.");
  }

  const sourceQuestionIds = new Set(draft.sourceQuestionIds);
  for (const target of draft.targets) {
    if (target.targetType === "question" && sourceQuestionIds.has(target.targetId)) {
      errors.push("A source question cannot also be its own follow-up target.");
    }

    if (target.targetType === "section") {
      const sectionQuestionIds = new Set(
        definition.questions.filter((question) => question.sectionId === target.targetId).map((question) => question.id)
      );

      if ([...sourceQuestionIds].some((questionId) => sectionQuestionIds.has(questionId))) {
        errors.push("A follow-up section cannot contain one of the source questions for the same score.");
      }
    }
  }

  const conflictingScore = definition.calculatedScores.find(
    (score) => score.id !== input.existingScoreId && score.key.trim().toUpperCase() === draft.key.trim().toUpperCase()
  );

  if (conflictingScore) {
    errors.push(`Internal key "${draft.key}" is already used by "${conflictingScore.name}".`);
  }

  return errors;
};

export const buildQuestionGroupsBySection = (sections: SurveySection[], questions: Question[]) =>
  sections.map((section) => ({
    questions: questions.filter((question) => question.sectionId === section.id).sort((left, right) => left.position - right.position),
    section
  }));
