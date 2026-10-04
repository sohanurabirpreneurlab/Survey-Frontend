// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const question = { id: "q1", sectionId: "s1", type: "yes_no", title: "Feedback?", settings: {}, required: true, position: 0, validation: {}, displayLogic: {} };
  return { question,
    definition: { sections: [{ id: "s1", position: 0 }], questions: [question], options: [], calculatedScores: [], version: { id: "v1", status: "draft" } },
    survey: { currentDraftVersionId: "v1", access: { canEdit: true } },
    update: vi.fn(), fetch: vi.fn(), fetchQuery: vi.fn(), reorder: vi.fn()
  };
});
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey.includes("version") ? mocks.definition : mocks.survey }),
  useMutation: () => ({}), useQueryClient: () => ({ fetchQuery: mocks.fetchQuery })
}));
vi.mock("../auth/use-auth", () => ({ useAuth: () => ({ accessToken: "test" }) }));
vi.mock("../../lib/api", () => ({ ApiError: class extends Error {} }));
vi.mock("../../state/toast-store", () => ({ toast: { danger: vi.fn(), success: vi.fn() } }));
vi.mock("./surveys.api", () => ({ updateQuestionRequest: mocks.update, getSurveyVersionRequest: mocks.fetch, reorderQuestionsRequest: mocks.reorder }));
import { useSurveyBuilder } from "./use-survey-builder";
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  mocks.update.mockImplementation(async (_token, _surveyId, _id, input) => ({ ...mocks.question, ...input }));
  mocks.fetchQuery.mockResolvedValue(mocks.definition);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });
it("flush saves the latest debounced setting before fetching preview data, without duplicate saves", async () => {
  const { result } = renderHook(() => useSurveyBuilder("survey1"));
  act(() => result.current.updateQuestion("q1", { settings: { descriptionWhen: "yes" } }));
  act(() => result.current.updateQuestion("q1", { settings: { descriptionWhen: "no" } }));
  expect(mocks.update).not.toHaveBeenCalled();
  await act(async () => { await result.current.flushPendingSaves(); });
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.update.mock.calls[0][3].settings.descriptionWhen).toBe("no");
  expect(mocks.fetchQuery).toHaveBeenCalledTimes(1);
  expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.fetchQuery.mock.invocationCallOrder[0]);
  await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
it("flush waits for an in-flight save before fetching preview data", async () => {
  let finish!: (value: unknown) => void;
  mocks.update.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = renderHook(() => useSurveyBuilder("survey1"));
  act(() => result.current.updateQuestion("q1", { settings: { descriptionWhen: "yes" } }));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  let flushing!: Promise<void>;
  act(() => { flushing = result.current.flushPendingSaves(); });
  expect(mocks.fetchQuery).not.toHaveBeenCalled();
  await act(async () => { finish({ ...mocks.question, settings: { descriptionWhen: "yes" } }); await flushing; });
  expect(mocks.fetchQuery).toHaveBeenCalledTimes(1);
});
it("flush rejects failed saves instead of loading outdated preview data", async () => {
  mocks.update.mockRejectedValue(new Error("Save failed"));
  const { result } = renderHook(() => useSurveyBuilder("survey1"));
  act(() => result.current.updateQuestion("q1", { settings: { descriptionWhen: "yes" } }));
  await act(async () => { await expect(result.current.flushPendingSaves()).rejects.toThrow("Save failed"); });
  expect(mocks.fetchQuery).not.toHaveBeenCalled();
  expect(result.current.saveState).toBe("failed");
});

it("saves edits carrying the old position before reordering questions", async () => {
  mocks.definition.questions.push({ ...mocks.question, id: "q2", position: 1 });
  mocks.reorder.mockResolvedValue([{ ...mocks.question, position: 1 }, { ...mocks.question, id: "q2", position: 0 }]);
  try {
    const { result } = renderHook(() => useSurveyBuilder("survey1"));
    act(() => result.current.updateQuestion("q1", { settings: { descriptionWhen: "yes" } }));
    await act(async () => { await result.current.moveQuestion("q1", 1); });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.reorder).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.reorder.mock.invocationCallOrder[0]);
    expect(mocks.reorder.mock.calls[0][3]).toEqual([{ questionId: "q2", position: 0 }, { questionId: "q1", position: 1 }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(mocks.update).toHaveBeenCalledTimes(1);
  } finally {
    mocks.definition.questions.pop();
  }
});
