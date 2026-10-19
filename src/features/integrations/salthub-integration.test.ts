// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureSaltHubIntegrationContext,
  isAllowedSaltHubOrigin,
  loadSaltHubIntegrationContext,
  notifySaltHubOfSubmission,
  SALTHUB_CONTEXT_STORAGE_KEY
} from "./salthub-integration";

const allowedOrigins = ["https://salthub.example.com", "http://localhost:3000"];
const channel = "550e8400-e29b-41d4-a716-446655440000";
const surveyId = "123e4567-e89b-12d3-a456-426614174000";
const integrationSearch = `?salthubReturnOrigin=${encodeURIComponent(allowedOrigins[0])}&salthubChannel=${channel}&salthubSurveyId=${surveyId}`;

const setOpener = (opener: { postMessage: ReturnType<typeof vi.fn> } | null) => {
  Object.defineProperty(window, "opener", { configurable: true, value: opener, writable: true });
};

describe("SaltHub survey completion integration", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setOpener(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("captures valid query parameters and preserves them after the URL parameters disappear", () => {
    const captured = captureSaltHubIntegrationContext(integrationSearch, allowedOrigins);

    expect(captured).toEqual({ channel, returnOrigin: allowedOrigins[0], surveyId });
    expect(JSON.parse(window.sessionStorage.getItem(SALTHUB_CONTEXT_STORAGE_KEY)!)).toEqual(captured);
    expect(loadSaltHubIntegrationContext(allowedOrigins)).toEqual(captured);
  });

  it("sends one exact-origin message with the required contract", () => {
    captureSaltHubIntegrationContext(integrationSearch, allowedOrigins);
    const postMessage = vi.fn();
    setOpener({ postMessage });

    expect(notifySaltHubOfSubmission(allowedOrigins)).toBe(true);
    expect(notifySaltHubOfSubmission(allowedOrigins)).toBe(false);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      { channel, surveyId, type: "salthub:survey-submitted" },
      "https://salthub.example.com"
    );
    expect(postMessage).not.toHaveBeenCalledWith(expect.anything(), "*");
  });

  it("does nothing when opener is missing and does not throw", () => {
    captureSaltHubIntegrationContext(integrationSearch, allowedOrigins);
    setOpener(null);

    expect(() => notifySaltHubOfSubmission(allowedOrigins)).not.toThrow();
    expect(notifySaltHubOfSubmission(allowedOrigins)).toBe(false);
  });

  it("rejects an unapproved return origin without replacing stored valid context", () => {
    captureSaltHubIntegrationContext(integrationSearch, allowedOrigins);
    const maliciousSearch = `?salthubReturnOrigin=https%3A%2F%2Fevil.example&salthubChannel=${channel}&salthubSurveyId=${surveyId}`;

    expect(captureSaltHubIntegrationContext(maliciousSearch, allowedOrigins)).toBeNull();
    expect(loadSaltHubIntegrationContext(allowedOrigins)?.returnOrigin).toBe(allowedOrigins[0]);
    expect(isAllowedSaltHubOrigin("https://evil.example", allowedOrigins)).toBe(false);
  });

  it("replaces stored context when a fresh valid integration link is opened", () => {
    captureSaltHubIntegrationContext(integrationSearch, allowedOrigins);
    const nextChannel = "550e8400-e29b-41d4-a716-446655440001";
    const nextSearch = `?salthubReturnOrigin=http%3A%2F%2Flocalhost%3A3000&salthubChannel=${nextChannel}&salthubSurveyId=${surveyId}`;

    captureSaltHubIntegrationContext(nextSearch, allowedOrigins);
    expect(loadSaltHubIntegrationContext(allowedOrigins)).toEqual({
      channel: nextChannel,
      returnOrigin: "http://localhost:3000",
      surveyId
    });
  });

  it("keeps normal non-SaltHub links unchanged", () => {
    const postMessage = vi.fn();
    setOpener({ postMessage });

    expect(captureSaltHubIntegrationContext("?unrelated=value", allowedOrigins)).toBeNull();
    expect(notifySaltHubOfSubmission(allowedOrigins)).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
