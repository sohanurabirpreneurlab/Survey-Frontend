// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  danger: vi.fn(),
  success: vi.fn()
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, apiRequest: mocks.apiRequest };
});

vi.mock("../lib/env", () => ({
  env: {
    apiBaseUrl: "http://localhost:5000/api/v1",
    appName: "Survey Platform",
    backendBaseUrl: "http://localhost:5000",
    salthubAllowedOrigins: ["https://salthub.example.com"]
  }
}));

vi.mock("../state/toast-store", () => ({
  toast: { danger: mocks.danger, info: vi.fn(), success: mocks.success }
}));

import { SALTHUB_CONTEXT_STORAGE_KEY } from "../features/integrations/salthub-integration";
import { ApiError } from "../lib/api";
import { InvitationSurveyPage } from "./PublicSurveyPage";

const channel = "550e8400-e29b-41d4-a716-446655440000";
const surveyId = "123e4567-e89b-12d3-a456-426614174000";

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    }
  };
};

const survey = (required = false) => ({
  calculatedScores: [],
  description: null,
  options: [],
  publicSlug: "feedback",
  questions: [{
    description: null,
    displayLogic: { conditions: [] },
    id: "question-1",
    position: 0,
    required,
    sectionId: "section-1",
    settings: {},
    stableKey: "feedback",
    title: "Feedback",
    type: "short_text",
    validation: {}
  }],
  respondentIdentity: { email: "person@example.com", isAnonymous: false, role: null },
  respondentSessionToken: "session-token",
  sections: [{ description: null, id: "section-1", position: 0, settings: {}, stableKey: "main", title: "Main" }],
  settings: { confirmationMessage: "Done", showProgressBar: true, showQuestionNumbers: true, theme: {} },
  title: "SaltHub survey"
});

const renderInvitation = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/i/invitation-token"]}>
        <Routes><Route path="/i/:token" element={<InvitationSurveyPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("SaltHub notification in the invitation submission flow", () => {
  const postMessage = vi.fn();

  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.danger.mockReset();
    mocks.success.mockReset();
    postMessage.mockReset();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage()
    });
    window.sessionStorage.clear();
    window.sessionStorage.setItem(SALTHUB_CONTEXT_STORAGE_KEY, JSON.stringify({
      channel,
      returnOrigin: "https://salthub.example.com",
      surveyId
    }));
    Object.defineProperty(window, "opener", { configurable: true, value: { postMessage }, writable: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("notifies SaltHub only after the final submit request succeeds", async () => {
    mocks.apiRequest.mockImplementation((path: string) =>
      path === "/respondent/responses/submit"
        ? Promise.resolve({ id: "response-1", revision: 1, status: "submitted", submittedAt: "2026-10-19T09:00:00.000Z" })
        : Promise.resolve(survey())
    );
    renderInvitation();

    fireEvent.click(await screen.findByRole("button", { name: /Submit/ }));

    await screen.findByText("Thank you!");
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      { channel, surveyId, type: "salthub:survey-submitted" },
      "https://salthub.example.com"
    );
  });

  it("notifies SaltHub when the server rejects the submit request", async () => {
    mocks.apiRequest.mockImplementation((path: string) =>
      path === "/respondent/responses/submit"
        ? Promise.reject(new ApiError(503, {
            error: { code: "SERVICE_UNAVAILABLE", details: null, message: "Submission service unavailable" },
            meta: { requestId: "request-1" },
            success: false
          }))
        : Promise.resolve(survey())
    );
    renderInvitation();

    fireEvent.click(await screen.findByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(mocks.danger).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      { channel, surveyId, type: "salthub:survey-submitted" },
      "https://salthub.example.com"
    );
  });

  it("notifies SaltHub when the submit request cannot reach the server", async () => {
    mocks.apiRequest.mockImplementation((path: string) =>
      path === "/respondent/responses/submit"
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve(survey())
    );
    renderInvitation();

    fireEvent.click(await screen.findByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(mocks.danger).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it("does not notify SaltHub for a rejected submission caused by client input", async () => {
    mocks.apiRequest.mockImplementation((path: string) =>
      path === "/respondent/responses/submit"
        ? Promise.reject(new ApiError(422, {
            error: { code: "VALIDATION_ERROR", details: null, message: "Invalid answers" },
            meta: { requestId: "request-2" },
            success: false
          }))
        : Promise.resolve(survey())
    );
    renderInvitation();

    fireEvent.click(await screen.findByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(mocks.danger).toHaveBeenCalled());
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("does not submit or notify when client-side validation fails", async () => {
    mocks.apiRequest.mockImplementation(() => Promise.resolve(survey(true)));
    renderInvitation();

    fireEvent.click(await screen.findByRole("button", { name: /Submit/ }));

    await screen.findByText("Please complete this question and any required description before submitting.");
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("does not notify while an answer is only saved locally", async () => {
    mocks.apiRequest.mockImplementation(() => Promise.resolve(survey()));
    renderInvitation();

    fireEvent.change(await screen.findByPlaceholderText("Type your answer"), { target: { value: "Draft answer" } });

    await waitFor(() => expect(window.localStorage.length).toBeGreaterThan(0));
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
