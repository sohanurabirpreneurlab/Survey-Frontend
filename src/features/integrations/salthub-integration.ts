import { env } from "../../lib/env";

export type SaltHubIntegrationContext = {
  channel: string;
  returnOrigin: string;
  surveyId: string;
};

export const SALTHUB_CONTEXT_STORAGE_KEY = "salthub_integration_context";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeOrigin = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.href === `${url.origin}/` || url.href === url.origin ? url.origin : null;
  } catch {
    return null;
  }
};

export const isAllowedSaltHubOrigin = (
  origin: string,
  allowedOrigins: readonly string[] = env.salthubAllowedOrigins
): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(
    normalizedOrigin &&
    allowedOrigins.some((allowedOrigin) => normalizeOrigin(allowedOrigin) === normalizedOrigin)
  );
};

const isValidContext = (
  context: SaltHubIntegrationContext,
  allowedOrigins: readonly string[]
): boolean =>
  uuidPattern.test(context.channel) &&
  uuidPattern.test(context.surveyId) &&
  isAllowedSaltHubOrigin(context.returnOrigin, allowedOrigins);

export const captureSaltHubIntegrationContext = (
  search = typeof window === "undefined" ? "" : window.location.search,
  allowedOrigins: readonly string[] = env.salthubAllowedOrigins
): SaltHubIntegrationContext | null => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(search);
  const context: SaltHubIntegrationContext = {
    channel: params.get("salthubChannel")?.trim() ?? "",
    returnOrigin: normalizeOrigin(params.get("salthubReturnOrigin")?.trim() ?? "") ?? "",
    surveyId: params.get("salthubSurveyId")?.trim() ?? ""
  };

  if (!isValidContext(context, allowedOrigins)) return null;

  try {
    window.sessionStorage.setItem(SALTHUB_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
};

export const loadSaltHubIntegrationContext = (
  allowedOrigins: readonly string[] = env.salthubAllowedOrigins
): SaltHubIntegrationContext | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawContext = window.sessionStorage.getItem(SALTHUB_CONTEXT_STORAGE_KEY);
    if (!rawContext) return null;
    const context = JSON.parse(rawContext) as Partial<SaltHubIntegrationContext>;
    if (
      typeof context.channel !== "string" ||
      typeof context.returnOrigin !== "string" ||
      typeof context.surveyId !== "string"
    ) {
      return null;
    }

    const validatedContext = context as SaltHubIntegrationContext;
    return isValidContext(validatedContext, allowedOrigins) ? validatedContext : null;
  } catch {
    return null;
  }
};

const notificationStorageKey = ({ channel, surveyId }: SaltHubIntegrationContext) =>
  `salthub_completion_notified:${surveyId}:${channel}`;

export const notifySaltHubOfSubmission = (
  allowedOrigins: readonly string[] = env.salthubAllowedOrigins
): boolean => {
  if (typeof window === "undefined") return false;

  const context = loadSaltHubIntegrationContext(allowedOrigins);
  if (!context || !window.opener || !isAllowedSaltHubOrigin(context.returnOrigin, allowedOrigins)) {
    return false;
  }

  const notifiedKey = notificationStorageKey(context);

  try {
    if (window.sessionStorage.getItem(notifiedKey) === "true") return false;

    window.opener.postMessage(
      {
        channel: context.channel,
        surveyId: context.surveyId,
        type: "salthub:survey-submitted"
      },
      context.returnOrigin
    );
    window.sessionStorage.setItem(notifiedKey, "true");
    return true;
  } catch {
    return false;
  }
};
