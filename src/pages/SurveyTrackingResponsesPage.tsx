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
import { adminTw, pageTw, surveyTw, trackingTw } from "../lib/page-tailwind";

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
      <div className={pageTw.page}>
        <section className={pageTw.hero}>
          <h1>Loading tracked responses...</h1>
          <p>The survey response detail is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <h1>{surveyQuery.data.slug}</h1>
          <p>Review tracked responses in a spreadsheet layout or open one response at a time in a read-only survey form.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/app/tracking-surveys">Back to tracking</Link>
        </Button>
      </section>

      <Card className={trackingTw.controlsCard}>
        <div className={trackingTw.controls}>
          <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Response view mode">
            <button
              aria-pressed={viewMode === "all"}
              className={`${surveyTw.tab} ${viewMode === "all" ? surveyTw.tabActive : ""}`}
              onClick={() => setViewMode("all")}
              type="button"
            >
              All Response
            </button>
            <button
              aria-pressed={viewMode === "individual"}
              className={`${surveyTw.tab} ${viewMode === "individual" ? surveyTw.tabActive : ""}`}
              onClick={() => setViewMode("individual")}
              type="button"
            >
              Individual Response
            </button>
          </div>

          <div className={trackingTw.filters}>
            <label className={trackingTw.search}>
              <Search size={16} />
              <Input
                className={trackingTw.searchInput}
                onChange={(event) => setEmailFilter(event.target.value)}
                placeholder="Filter by email"
                value={emailFilter}
              />
            </label>

            <div className="min-w-[190px] max-app-mobile:w-full">
              <select className={adminTw.select} onChange={(event) => setSortOrder(event.target.value as "latest" | "earliest")} value={sortOrder}>
                <option value="latest">Latest response</option>
                <option value="earliest">Early response</option>
              </select>
              {sortOrder === "latest" ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
            </div>
          </div>
        </div>
      </Card>

      <Card className={adminTw.tableCard}>
        <div className={adminTw.tableWrap}>
          {viewMode === "all" ? (
            <table className={`${adminTw.table} min-w-[1320px] max-app-mobile:table max-app-mobile:min-w-[980px]`}>
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
                        <div className={adminTw.tableMeta}>
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
                        <span className={`${trackingTw.badge} ${response.responseStatus === "submitted" ? "bg-app-success-soft text-app-success" : "bg-app-warning-soft text-app-warning"}`}>
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
            <table className={adminTw.table}>
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
                      <div className={adminTw.tableMeta}>
                        <strong>{response.respondentEmail ?? "Anonymous public respondent"}</strong>
                        <span>{response.accessSource === "invitation" ? "Invitation link" : "Public link"}</span>
                      </div>
                    </td>
                    <td data-label="Source">{response.accessSource}</td>
                    <td data-label="Response">
                      <span className={`${trackingTw.badge} ${response.responseStatus === "submitted" ? "bg-app-success-soft text-app-success" : "bg-app-warning-soft text-app-warning"}`}>
                        {response.responseStatus}
                      </span>
                    </td>
                    <td data-label="Session">{response.sessionStatus}</td>
                    <td data-label="Submitted">
                      {response.submittedAt ? (
                        <div className={adminTw.tableMeta}>
                          <strong>{formatRelativeTime(response.submittedAt)}</strong>
                          <span>{formatDateTime(response.submittedAt) ?? response.submittedAt}</span>
                        </div>
                      ) : (
                        "Not submitted"
                      )}
                    </td>
                    <td data-label="Last saved">
                      <div className={adminTw.tableMeta}>
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
