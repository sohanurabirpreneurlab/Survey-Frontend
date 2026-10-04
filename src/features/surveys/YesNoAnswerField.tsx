import { readYesNoAnswer, readYesNoDescription, selectYesNoAnswer, showsYesNoDescription } from "./yes-no-description";

type Props = {
  question: { id: string; settings: Record<string, unknown> };
  value: unknown;
  onChange: (value: unknown) => void;
  primaryColor: string;
};

export const YesNoAnswerField = ({ question, value, onChange, primaryColor }: Props) => (
  <>
    {[{ label: "Yes", answer: true }, { label: "No", answer: false }].map((option, index) => {
      const selected = readYesNoAnswer(value) === option.answer;
      return (
        <label key={option.label} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-app-border-strong [border-style:solid] bg-white px-3.5 py-2.5 hover:border-app-primary hover:bg-app-primary-soft" style={selected ? { backgroundColor: `${primaryColor}12`, borderColor: primaryColor } : undefined}>
          <input className="sr-only" type="radio" name={question.id} checked={selected} onChange={() => onChange(selectYesNoAnswer(question.settings, value, option.answer))} />
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-app-border-strong text-xs font-bold" style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : undefined}>{String.fromCharCode(65 + index)}</span>
          <span className="font-medium">{option.label}</span>
        </label>
      );
    })}
    {showsYesNoDescription(question.settings, value) ? (
      <label className="grid gap-2 text-sm font-medium">
        <span>{typeof question.settings.descriptionLabel === "string" && question.settings.descriptionLabel.trim() ? question.settings.descriptionLabel : "Please describe"}{question.settings.descriptionRequired === true ? " *" : " (optional)"}</span>
        <textarea className="w-full rounded-xl border border-app-border-strong [border-style:solid] bg-white p-3 text-app-text" rows={4} maxLength={5000} required={question.settings.descriptionRequired === true} value={readYesNoDescription(value)} onChange={(event) => onChange({ answer: readYesNoAnswer(value), description: event.target.value })} />
      </label>
    ) : null}
  </>
);
