export const descriptionModes = ["off", "yes", "no", "both"] as const;
export type DescriptionMode = typeof descriptionModes[number];

export const readYesNoAnswer = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && "answer" in value && typeof value.answer === "boolean") return value.answer;
  return null;
};

export const readYesNoDescription = (value: unknown): string =>
  value && typeof value === "object" && "description" in value && typeof value.description === "string"
    ? value.description : "";

export const readDescriptionMode = (settings: Record<string, unknown>): DescriptionMode =>
  descriptionModes.includes(settings.descriptionWhen as DescriptionMode) ? settings.descriptionWhen as DescriptionMode : "off";

export const showsYesNoDescription = (settings: Record<string, unknown>, value: unknown): boolean => {
  const answer = readYesNoAnswer(value);
  const mode = readDescriptionMode(settings);
  return answer !== null && (mode === "both" || (mode === "yes" && answer) || (mode === "no" && !answer));
};

export const selectYesNoAnswer = (settings: Record<string, unknown>, previous: unknown, answer: boolean) =>
  showsYesNoDescription(settings, answer)
    ? { answer, description: readYesNoAnswer(previous) === answer ? readYesNoDescription(previous) : "" }
    : answer;

export const normalizeYesNoAnswer = (settings: Record<string, unknown>, value: unknown) => {
  const answer = readYesNoAnswer(value);
  return showsYesNoDescription(settings, value)
    ? { answer, description: readYesNoDescription(value).trim() }
    : answer;
};

export const missingYesNoDescription = (settings: Record<string, unknown>, value: unknown): boolean =>
  settings.descriptionRequired === true && showsYesNoDescription(settings, value) && !readYesNoDescription(value).trim();
