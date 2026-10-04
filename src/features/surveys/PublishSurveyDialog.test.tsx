// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishSurveyDialog } from "./PublishSurveyDialog";
import { describePublishErrors } from "./publish-errors";
import type { SurveyVersionDefinition } from "./surveys.types";
afterEach(cleanup);
const definition = {
  version: { versionNumber: 1 },
  sections: [{ id: "s", title: "Business Pipeline", position: 0 }],
  questions: [{ id: "q", sectionId: "s", title: "Does this take more time?", position: 0 }],
  calculatedScores: [{ id: "score", name: "No Time Saved" }]
} as SurveyVersionDefinition;
const publishError = Object.assign(new Error("The draft survey is not ready to publish."), {
  details: [{ field: "question:q:options", message: "Choice questions must have at least two options." }]
});
it("keeps the modal open after rejection and names the section and question", async () => {
  const onEdit = vi.fn();
  render(<PublishSurveyDialog definition={definition} onPublish={vi.fn().mockRejectedValue(publishError)} onEdit={onEdit} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("button", { name: "Publish survey" }));
  expect(await screen.findByText("Unable to publish survey")).toBeTruthy();
  expect(screen.getByText("Business Pipeline · Question 1.1: Does this take more time?")).toBeTruthy();
  expect(screen.getByText("Choice questions must have at least two options.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit question" }));
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ questionId: "q", sectionId: "s" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});
it("shows save/network errors without discarding their message", async () => {
  render(<PublishSurveyDialog definition={definition} onPublish={vi.fn().mockRejectedValue(new Error("Unable to save the draft."))} onEdit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("button", { name: "Publish survey" }));
  expect(await screen.findByText("Unable to save the draft.")).toBeTruthy();
});
it("prevents duplicate requests while publishing and closes after success", async () => {
  let finish!: () => void;
  const onPublish = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<PublishSurveyDialog definition={definition} onPublish={onPublish} onEdit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("button", { name: "Publish survey" }));
  expect((screen.getByRole("button", { name: "Publishing..." }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Publishing..." }));
  expect(onPublish).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});
it("retains multiple errors, score names, and unknown-field messages", () => {
  const errors = describePublishErrors({ details: [
    ...publishError.details,
    { field: "calculatedScore:score:questions", message: "Incompatible score ranges." },
    { path: "title", message: "Title is required." },
    { field: "question:missing:options", message: "Question is missing." }
  ] }, definition);
  expect(errors).toHaveLength(4);
  expect(errors[1]).toMatchObject({ label: "Calculated score: No Time Saved", scoreId: "score" });
  expect(errors[2]).toMatchObject({ label: "Survey title", message: "Title is required." });
  expect(errors[3]).toMatchObject({ label: "Question", message: "Question is missing." });
});
