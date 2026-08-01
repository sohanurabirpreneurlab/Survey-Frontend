import { useQuery } from "@tanstack/react-query";
import { ArrowDownAZ, ArrowUpAZ, Search, TableProperties } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../features/auth/use-auth";
import { listTrackingResponsesRequest } from "../features/survey-tracking/survey-tracking.api";
import { surveyTrackingKeys } from "../features/survey-tracking/survey-tracking.keys";
import { getSurveyRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";
export const SurveyTrackingResponsesPage = () => {
  const { surveyId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [viewMode, setViewMode] = useState<"all" | "individual">("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "earliest">("latest");
  const [emailFilter, setEmailFilter] = useState("");

  const surveyQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSurveyRequest(token, surveyId),
    queryKey: surveyKeys.detail(surveyId)
  });

  const responsesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listTrackingResponsesRequest(token, surveyId),
    queryKey: surveyTrackingKeys.responses(surveyId)
  });

  const responseRows = responsesQuery.data?.items ?? [];
  const responseColumns = responsesQuery.data?.columns ?? [];

  const responseItems = useMemo(() => {
    const normalizedEmail = emailFilter.trim().toLowerCase();
    const filtered = responseRows.filter((response) => {
      if (!normalizedEmail) {
        return true;
      }

      return (response.respondentEmail ?? "").toLowerCase().includes(normalizedEmail);
    });

    return [...filtered].sort((left, right) => {
      const leftTime = Date.parse(left.submittedAt ?? left.lastSavedAt ?? left.sessionCreatedAt);
      const rightTime = Date.parse(right.submittedAt ?? right.lastSavedAt ?? right.sessionCreatedAt);

      return sortOrder === "latest" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [emailFilter, responseRows, sortOrder]);

  if (surveyQuery.isLoading || responsesQuery.isLoading || !surveyQuery.data || !responsesQuery.data) {
    return (
      <div className="grid gap-6">
        <section className="rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:p-[22px]">
          <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Loading tracked responses...</h1>
          <p className="m-0 text-app-text-soft">The survey response detail is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="flex items-start justify-between gap-4 rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:flex-col max-app-mobile:items-stretch max-app-mobile:p-[22px]">
        <div>
          <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">{surveyQuery.data.slug}</h1>
          <p className="m-0 text-app-text-soft">Review tracked responses in a spreadsheet layout or open one response at a time in a read-only survey form.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/app/tracking-surveys">Back to tracking</Link>
        </Button>
      </section>

      <Card className="px-[22px] py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 max-app-mobile:items-stretch">
          <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Response view mode">
            <button
              aria-pressed={viewMode === "all"}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border [border-style:solid] px-3.5 transition-colors ${viewMode === "all" ? "border-app-border-strong bg-app-primary-soft text-app-primary-strong" : "border-app-border bg-app-surface-muted text-app-text-soft hover:bg-app-surface-strong"}`}
              onClick={() => setViewMode("all")}
              type="button"
            >
              All Response
            </button>
            <button
              aria-pressed={viewMode === "individual"}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border [border-style:solid] px-3.5 transition-colors ${viewMode === "individual" ? "border-app-border-strong bg-app-primary-soft text-app-primary-strong" : "border-app-border bg-app-surface-muted text-app-text-soft hover:bg-app-surface-strong"}`}
              onClick={() => setViewMode("individual")}
              type="button"
            >
              Individual Response
            </button>
          </div>

          <div className="flex flex-[420px] flex-wrap items-center justify-end gap-3 max-app-mobile:justify-stretch">
            <label className="flex flex-[280px] items-center gap-2.5 text-app-text-soft max-app-mobile:basis-full">
              <Search size={16} />
              <Input
                className="min-w-[220px] flex-1 border-0 bg-transparent text-app-text shadow-none outline-none focus:shadow-none max-app-mobile:w-full"
                onChange={(event) => setEmailFilter(event.target.value)}
                placeholder="Filter by email"
                value={emailFilter}
              />
            </label>

            <div className="relative min-w-[190px] max-app-mobile:w-full">
              <select className="min-h-[50px] w-full appearance-none rounded-[14px] border border-app-border [border-style:solid] bg-white px-4 pr-10 text-app-text outline-none focus:border-app-primary focus:shadow-[0_0_0_4px_rgba(24,79,190,0.12)]" onChange={(event) => setSortOrder(event.target.value as "latest" | "earliest")} value={sortOrder}>
                <option value="latest">Latest response</option>
                <option value="earliest">Early response</option>
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-app-text-soft">{sortOrder === "latest" ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          {viewMode === "all" ? (
            <table className="w-full min-w-[1320px] border-collapse [&_th]:bg-app-surface-muted [&_th]:px-[18px] [&_th]:py-4 [&_th]:text-left [&_th]:text-[0.82rem] [&_th]:font-bold [&_th]:tracking-[0.06em] [&_th]:text-app-text-faint [&_th]:uppercase [&_td]:border-b [&_td]:border-app-border [&_td]:px-[18px] [&_td]:py-4 [&_td]:text-left [&_td]:align-top max-app-mobile:table max-app-mobile:min-w-[980px]">
              <thead>
                <tr>
                  <th>Response</th>
                  <th>Respondent</th>
                  {responseColumns.map((column, index) => (
                    <th key={column.questionStableKey}>
                      <div className="grid gap-1">
                        <strong>Q{index + 1}</strong>
                        <span>{column.title}</span>
                      </div>
                    </th>
                  ))}
                  <th>Source</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Last saved</th>

                </tr>
              </thead>
              <tbody>
                {responseItems.map((response, rowIndex) => {
                  const answerMap = new Map(response.answers.map((answer) => [answer.questionStableKey, answer.displayValue]));

                  return (
                    <tr key={response.responseId}>
                      <td data-label="Response">#{rowIndex + 1}</td>
                      <td data-label="Respondent">
                        <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
                          <strong>{response.respondentEmail ?? "Anonymous"}</strong>
                          <span>{response.respondentEmail ? "Specific email" : "Anonymous public respondent"}</span>
                        </div>
                      </td>
                      {responseColumns.map((column) => (
                        <td data-label={column.title} key={column.questionStableKey}>
                          <span className="inline-block max-w-[240px] whitespace-pre-wrap [overflow-wrap:anywhere]">{answerMap.get(column.questionStableKey) ?? "No answer"}</span>
                        </td>
                      ))}
                      <td data-label="Source">{response.accessSource === "invitation" ? "Invitation link" : "Public link"}</td>
                      <td data-label="Status">
                        <span className={`inline-flex rounded-full px-2.5 py-1.5 text-[0.82rem] font-bold capitalize ${response.responseStatus === "submitted" ? "bg-app-success-soft text-app-success" : "bg-app-warning-soft text-app-warning"}`}>
                          {response.responseStatus}
                        </span>
                      </td>
                      <td data-label="Submitted">{formatDateTime(response.submittedAt) ?? "Not submitted"}</td>
                      <td data-label="Last saved">{formatDateTime(response.lastSavedAt) ?? response.lastSavedAt}</td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[860px] border-collapse [&_th]:bg-app-surface-muted [&_th]:px-[18px] [&_th]:py-4 [&_th]:text-left [&_th]:text-[0.82rem] [&_th]:font-bold [&_th]:tracking-[0.06em] [&_th]:text-app-text-faint [&_th]:uppercase [&_td]:border-b [&_td]:border-app-border [&_td]:px-[18px] [&_td]:py-4 [&_td]:text-left [&_td]:align-top max-app-mobile:block max-app-mobile:min-w-0 max-app-mobile:[&_thead]:hidden max-app-mobile:[&_tbody]:block max-app-mobile:[&_tr]:block max-app-mobile:[&_tr]:w-full max-app-mobile:[&_tr]:border-b max-app-mobile:[&_tr]:border-app-border max-app-mobile:[&_tr]:px-4 max-app-mobile:[&_tr]:py-3.5 max-app-mobile:[&_td]:grid max-app-mobile:[&_td]:w-full max-app-mobile:[&_td]:gap-1.5 max-app-mobile:[&_td]:border-b-0 max-app-mobile:[&_td]:px-0 max-app-mobile:[&_td]:pb-3 max-app-mobile:[&_td]:pt-0 max-app-mobile:[&_td]:before:content-[attr(data-label)] max-app-mobile:[&_td]:before:text-[0.78rem] max-app-mobile:[&_td]:before:font-bold max-app-mobile:[&_td]:before:tracking-[0.06em] max-app-mobile:[&_td]:before:text-app-text-faint max-app-mobile:[&_td]:before:uppercase">
              <thead>
                <tr>
                  <th>Respondent</th>
                  <th>Source</th>
                  <th>Response</th>
                  <th>Session</th>
                  <th>Submitted</th>
                  <th>Last saved</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {responseItems.map((response) => (
                  <tr key={response.responseId}>
                    <td data-label="Respondent">
                      <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
                        <strong>{response.respondentEmail ?? "Anonymous public respondent"}</strong>
                        <span>{response.accessSource === "invitation" ? "Invitation link" : "Public link"}</span>
                      </div>
                    </td>
                    <td data-label="Source">{response.accessSource}</td>
                    <td data-label="Response">
                      <span className={`inline-flex rounded-full px-2.5 py-1.5 text-[0.82rem] font-bold capitalize ${response.responseStatus === "submitted" ? "bg-app-success-soft text-app-success" : "bg-app-warning-soft text-app-warning"}`}>
                        {response.responseStatus}
                      </span>
                    </td>
                    <td data-label="Session">{response.sessionStatus}</td>
                    <td data-label="Submitted">
                      {response.submittedAt ? (
                        <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
                          <strong>{formatRelativeTime(response.submittedAt)}</strong>
                          <span>{formatDateTime(response.submittedAt) ?? response.submittedAt}</span>
                        </div>
                      ) : (
                        "Not submitted"
                      )}
                    </td>
                    <td data-label="Last saved">
                      <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
                        <strong>{formatRelativeTime(response.lastSavedAt)}</strong>
                        <span>{formatDateTime(response.lastSavedAt) ?? response.lastSavedAt}</span>
                      </div>
                    </td>
                    <td data-label="Action">
                      <Button asChild size="sm">
                        <Link to={`/app/tracking-surveys/${surveyId}/responses/${response.responseId}`}>
                          <TableProperties size={15} />
                          Preview
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
