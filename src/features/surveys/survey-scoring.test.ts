import { describe, expect, it } from "vitest";

import {
  buildQuestionGroupsBySection,
  buildQuestionUsageById,
  buildSectionConditionsById,
  formatScoreCondition,
  getQuestionScoreRange,
  isQuestionScoringEnabled,
  validateCalculatedScoreDraft
} from "./survey-scoring";
import type { Question, QuestionOption, SurveyCalculatedScore, SurveySection, SurveyVersionDefinition } from "./surveys.types";

const sectionA: SurveySection = {
  createdAt: "",
  description: null,
  id: "section-a",
  position: 0,
  settings: {},
  stableKey: "section_a",
  surveyVersionId: "version-1",
  title: "Section A",
  updatedAt: ""
};

const sectionB: SurveySection = {
  ...sectionA,
  id: "section-b",
  position: 1,
  stableKey: "section_b",
  title: "Section B"
};

const ratingQuestion: Question = {
  createdAt: "",
  description: null,
  displayLogic: {},
  id: "question-rating",
  position: 0,
  required: false,
  sectionId: sectionA.id,
  settings: { scoringEnabled: true },
  stableKey: "q_rating",
  surveyVersionId: "version-1",
  title: "Rating question",
  type: "rating",
  updatedAt: "",
  validation: { maximum: 5, minimum: 1 }
};

const choiceQuestion: Question = {
  ...ratingQuestion,
  id: "question-choice",
  sectionId: sectionB.id,
  stableKey: "q_choice",
  title: "Choice question",
  type: "single_choice",
  validation: {}
};

const options: QuestionOption[] = [
  {
    createdAt: "",
    id: "option-1",
    label: "Low",
    position: 0,
    questionId: choiceQuestion.id,
    scoreValue: 1,
    settings: {},
    stableKey: "option_1",
    updatedAt: "",
    value: "low"
  },
  {
    createdAt: "",
    id: "option-2",
    label: "High",
    position: 1,
    questionId: choiceQuestion.id,
    scoreValue: 5,
    settings: {},
    stableKey: "option_2",
    updatedAt: "",
    value: "high"
  }
];

const calculatedScore: SurveyCalculatedScore = {
  calculationType: "average",
  createdAt: "",
  decimalPlaces: 2,
  id: "score-1",
  key: "REI",
  name: "Role Effectiveness Index",
  questions: [
    {
      calculatedScoreId: "score-1",
      createdAt: "",
      id: "source-1",
      position: 0,
      questionId: ratingQuestion.id,
      weight: 1
    }
  ],
  requireAllAnswers: true,
  surveyVersionId: "version-1",
  targets: [
    {
      calculatedScoreId: "score-1",
      createdAt: "",
      id: "target-1",
      targetId: sectionB.id,
      targetType: "section",
      updatedAt: ""
    }
  ],
  thresholdOperator: "less_than_or_equal",
  thresholdValue: 3,
  updatedAt: ""
};

const definition: SurveyVersionDefinition = {
  calculatedScores: [calculatedScore],
  options,
  questions: [ratingQuestion, choiceQuestion],
  sections: [sectionA, sectionB],
  version: {
    archivedAt: null,
    changeSummary: null,
    createdAt: "",
    createdBy: "",
    createdFromVersionId: null,
    description: null,
    id: "version-1",
    publishedAt: null,
    publishedBy: null,
    settings: {
      allowBackNavigation: true,
      confirmationMessage: "",
      oneQuestionPerPage: false,
      redirectUrl: null,
      showConfirmationPage: true,
      showProgressBar: true,
      showQuestionNumbers: true,
      shuffleOptions: false,
      shuffleQuestions: false,
      theme: { logoUrl: null, primaryColor: null }
    },
    status: "draft",
    surveyId: "survey-1",
    title: "Demo",
    updatedAt: "",
    versionNumber: 1
  }
};

describe("survey scoring helpers", () => {
  it("detects scoring on rating and option-based scored questions", () => {
    expect(isQuestionScoringEnabled(ratingQuestion, [])).toBe(true);
    expect(isQuestionScoringEnabled(choiceQuestion, options)).toBe(true);
  });

  it("reads numeric score ranges for rating and choice questions", () => {
    expect(getQuestionScoreRange(ratingQuestion, [])).toEqual({ maximum: 5, minimum: 1 });
    expect(getQuestionScoreRange(choiceQuestion, options)).toEqual({ maximum: 5, minimum: 1 });
  });

  it("groups questions by section order", () => {
    const groups = buildQuestionGroupsBySection([sectionA, sectionB], [choiceQuestion, ratingQuestion]);
    expect(groups[0].section.id).toBe(sectionA.id);
    expect(groups[0].questions[0].id).toBe(ratingQuestion.id);
    expect(groups[1].section.id).toBe(sectionB.id);
    expect(groups[1].questions[0].id).toBe(choiceQuestion.id);
  });

  it("builds question and section usage maps from calculated scores", () => {
    const questionUsage = buildQuestionUsageById([calculatedScore]);
    const sectionConditions = buildSectionConditionsById([calculatedScore]);

    expect(questionUsage.get(ratingQuestion.id)?.[0].name).toBe("Role Effectiveness Index");
    expect(sectionConditions.get(sectionB.id)?.[0].key).toBe("REI");
  });

  it("formats conditional badge text", () => {
    expect(formatScoreCondition(calculatedScore)).toBe("REI <= 3");
  });

  it("blocks invalid calculated score drafts including circular section targets", () => {
    const invalid = validateCalculatedScoreDraft({
      definition,
      draft: {
        key: "rei",
        name: "",
        sourceQuestionIds: [choiceQuestion.id],
        targets: [{ targetId: sectionB.id, targetType: "section" }],
        thresholdValue: Number.NaN
      }
    });

    expect(invalid).toContain("Score name is required.");
    expect(invalid).toContain("Internal key may only contain uppercase letters, numbers, and underscores.");
    expect(invalid).toContain("Threshold value must be numeric.");
    expect(invalid).toContain("A follow-up section cannot contain one of the source questions for the same score.");
  });

  it("flags incompatible score ranges across source questions", () => {
    const widerRating: Question = {
      ...ratingQuestion,
      id: "question-rating-wide",
      stableKey: "q_rating_wide",
      title: "Wide rating",
      validation: { maximum: 10, minimum: 1 }
    };

    const invalid = validateCalculatedScoreDraft({
      definition: {
        ...definition,
        questions: [...definition.questions, widerRating]
      },
      draft: {
        key: "PSS",
        name: "Platform Satisfaction Score",
        sourceQuestionIds: [ratingQuestion.id, widerRating.id],
        targets: [{ targetId: choiceQuestion.id, targetType: "question" }],
        thresholdValue: 2.5
      }
    });

    expect(invalid).toContain("Selected questions cannot be averaged because they use different score ranges.");
  });
});
