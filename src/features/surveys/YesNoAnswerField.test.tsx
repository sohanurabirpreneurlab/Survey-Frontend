// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { YesNoAnswerField } from "./YesNoAnswerField";
import { missingYesNoDescription, normalizeYesNoAnswer, readYesNoAnswer } from "./yes-no-description";

afterEach(cleanup);
const Harness = ({ mode, required = false }: { mode: string; required?: boolean }) => {
  const [value, setValue] = useState<unknown>();
  return <><YesNoAnswerField question={{ id: "q", settings: { descriptionWhen: mode, descriptionRequired: required, descriptionLabel: "Explain your answer" } }} value={value} onChange={setValue} primaryColor="#184fbe" /><output data-testid="answer">{JSON.stringify(value)}</output></>;
};

describe("conditional description interactions", () => {
  for (const mode of ["off", "yes", "no", "both"]) {
    it(`reveals the description immediately for ${mode}`, () => {
      render(<Harness mode={mode} />);
      expect(screen.queryByRole("textbox")).toBeNull();
      fireEvent.click(screen.getByRole("radio", { name: /Yes/ }));
      expect(Boolean(screen.queryByRole("textbox"))).toBe(mode === "yes" || mode === "both");
      fireEvent.click(screen.getByRole("radio", { name: /No/ }));
      expect(Boolean(screen.queryByRole("textbox"))).toBe(mode === "no" || mode === "both");
      expect(readYesNoAnswer(JSON.parse(screen.getByTestId("answer").textContent!))).toBe(false);
    });
  }
  it("clears stale text when the answer changes and keeps it cleared when switching back", () => {
    render(<Harness mode="yes" required />);
    fireEvent.click(screen.getByRole("radio", { name: /Yes/ }));
    const textbox = screen.getByRole("textbox", { name: /Explain your answer/ }) as HTMLTextAreaElement;
    expect(textbox.required).toBe(true);
    fireEvent.change(textbox, { target: { value: "Old explanation" } });
    fireEvent.click(screen.getByRole("radio", { name: /No/ }));
    expect(screen.getByTestId("answer").textContent).toBe("false");
    fireEvent.click(screen.getByRole("radio", { name: /Yes/ }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
  it("normalizes legacy answers, strips hidden text, and checks required text only when shown", () => {
    const settings = { descriptionWhen: "no", descriptionRequired: true };
    expect(normalizeYesNoAnswer({}, false)).toBe(false);
    expect(normalizeYesNoAnswer(settings, { answer: true, description: "hidden" })).toBe(true);
    expect(normalizeYesNoAnswer(settings, { answer: false, description: " detail " })).toEqual({ answer: false, description: "detail" });
    expect(missingYesNoDescription(settings, false)).toBe(true);
    expect(missingYesNoDescription(settings, true)).toBe(false);
    expect(missingYesNoDescription(settings, undefined)).toBe(false);
    expect(missingYesNoDescription(settings, { answer: false, description: "   " })).toBe(true);
  });
});
