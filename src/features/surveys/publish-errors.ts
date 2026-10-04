import type { SurveyVersionDefinition } from "./surveys.types";

export type PublishIssue = { message: string; label: string; questionId?: string; sectionId?: string; scoreId?: string };
export const describePublishErrors = (error: unknown, definition: SurveyVersionDefinition): PublishIssue[] => {
  const details = error && typeof error === "object" && "details" in error ? error.details : null;
  const fallback = error instanceof Error ? error.message : "The draft could not be published. Please try again.";
  if (!Array.isArray(details) || details.length === 0) return [{ label: "Publish failed", message: fallback }];
  return details.map((issue): PublishIssue => {
    if (!issue || typeof issue !== "object") return { label: "Survey", message: fallback };
    const message = typeof issue.message === "string" ? issue.message : fallback;
    const field = typeof issue.field === "string" ? issue.field : typeof issue.path === "string" ? issue.path : "";
    const [kind, id] = field.split(":");
    const question = kind === "question" ? definition.questions.find((item) => item.id === id) : undefined;
    if (question) {
      const sections = [...definition.sections].sort((a, b) => a.position - b.position);
      const section = sections.find((item) => item.id === question.sectionId);
      const questions = definition.questions.filter((item) => item.sectionId === question.sectionId).sort((a, b) => a.position - b.position);
      const number = section ? `${sections.indexOf(section) + 1}.${questions.indexOf(question) + 1}` : "";
      return { label: `${section?.title || "Section"} · Question ${number}: ${question.title || "Untitled question"}`, message, questionId: question.id, sectionId: section?.id };
    }
    const score = kind === "calculatedScore" ? definition.calculatedScores.find((item) => item.id === id) : undefined;
    if (score) return { label: `Calculated score: ${score.name}`, message, scoreId: score.id };
    const labels: Record<string, string> = { title: "Survey title", sections: "Sections", questions: "Questions", question: "Question", calculatedScore: "Calculated scores" };
    return { label: labels[kind] ?? "Survey settings", message };
  });
};
