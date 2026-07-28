import { useQuery } from "@tanstack/react-query";
import { TableProperties } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
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

  if (surveyQuery.isLoading || responsesQuery.isLoading || !surveyQuery.data || !responsesQuery.data) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading tracked responses...</h1>
          <p>The survey response detail is loading.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero survey-page-hero">
        <div>
          <h1>{surveyQuery.data.slug}</h1>
          <p>Review tracked response attempts and open filled answers in a read-only survey form.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/app/tracking-surveys">Back to tracking</Link>
        </Button>
      </section>

      <Card className="admin-table-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
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
              {responsesQuery.data.map((response) => (
                <tr key={response.responseId}>
                  <td data-label="Respondent">
                    <div className="admin-table-meta">
                      <strong>{response.respondentEmail ?? "Anonymous public respondent"}</strong>
                      <span>{response.accessSource === "invitation" ? "Invitation link" : "Public link"}</span>
                    </div>
                  </td>
                  <td data-label="Source">{response.accessSource}</td>
                  <td data-label="Response">
                    <span className={`survey-badge ${response.responseStatus === "submitted" ? "survey-badge-published" : "survey-badge-draft"}`}>
                      {response.responseStatus}
                    </span>
                  </td>
                  <td data-label="Session">{response.sessionStatus}</td>
                  <td data-label="Submitted">
                    {response.submittedAt ? (
                      <div className="admin-table-meta">
                        <strong>{formatRelativeTime(response.submittedAt)}</strong>
                        <span>{formatDateTime(response.submittedAt) ?? response.submittedAt}</span>
                      </div>
                    ) : (
                      "Not submitted"
                    )}
                  </td>
                  <td data-label="Last saved">
                    <div className="admin-table-meta">
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
        </div>
      </Card>
    </div>
  );
};
