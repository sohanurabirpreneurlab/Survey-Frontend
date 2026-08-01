import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Eye, Mail, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import {
  listTrackedSurveysRequest,
  listTrackingRecipientsRequest
} from "../features/survey-tracking/survey-tracking.api";
import { surveyTrackingKeys } from "../features/survey-tracking/survey-tracking.keys";
import type { SurveyTrackingSummary } from "../features/survey-tracking/survey-tracking.types";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";
import { adminTw, pageTw, trackingTw } from "../lib/page-tailwind";

export const SurveyTrackingPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const trackingQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listTrackedSurveysRequest(token, { limit: 20, page }),
    queryKey: surveyTrackingKeys.surveys(page)
  });

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(Math.max(1, nextPage)));
    setSearchParams(params);
  };

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <h1>Tracking Survey</h1>
          <p>
            {auth.isPlatformAdmin
              ? "Monitor all surveys, invitation reach, and response progress across the platform."
              : "Monitor surveys from your organization, invited recipients, and filled responses."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <span className="rounded-full border border-app-border [border-style:solid] bg-white/90 px-3 py-2 text-[0.86rem] font-bold text-app-text-soft">
            <Users size={14} />
            Response tracking
          </span>
          <span className="rounded-full border border-app-border [border-style:solid] bg-white/90 px-3 py-2 text-[0.86rem] font-bold text-app-text-soft">
            <Mail size={14} />
            Invitation visibility
          </span>
        </div>
      </section>

      {trackingQuery.isLoading ? (
        <Card className={pageTw.empty}>
          <p>Loading tracked surveys...</p>
        </Card>
      ) : null}

      {trackingQuery.isError ? (
        <Card className={pageTw.empty}>
          <div>
            <h2>We could not load tracking data.</h2>
            <p>Try the request again.</p>
          </div>
          <Button onClick={() => void trackingQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!trackingQuery.isLoading && !trackingQuery.isError && trackingQuery.data ? (
        <>
      <Card className={adminTw.tableCard}>
        <div className={adminTw.tableWrap}>
          <table className={adminTw.table}>
                <thead>
                  <tr>
                    <th>Survey</th>
                    <th>Organization</th>
                    <th>Private</th>
                    <th>Invitations</th>
                    <th>Responses</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingQuery.data.items.map((survey) => (
                    <SurveyTrackingRow key={survey.id} survey={survey} token={token} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

      <div className={adminTw.pagination}>
            <span>
              Page {trackingQuery.data.pagination.page} of {trackingQuery.data.pagination.totalPages}
            </span>
            <div className={adminTw.actionRow}>
              <Button
                disabled={page <= 1}
                onClick={() => updatePage(page - 1)}
                size="sm"
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={page >= trackingQuery.data.pagination.totalPages}
                onClick={() => updatePage(page + 1)}
                size="sm"
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const SurveyTrackingRow = ({ survey, token }: { survey: SurveyTrackingSummary; token: string }) => {
  const recipientsQuery = useQuery({
    enabled: false,
    queryFn: () => listTrackingRecipientsRequest(token, survey.id),
    queryKey: surveyTrackingKeys.recipients(survey.id)
  });

  return (
    <tr>
      <td data-label="Survey">
      <div className={adminTw.tableMeta}>
          <strong>{survey.title ?? "Untitled survey"}</strong>
          <span>{survey.status}</span>
        </div>
      </td>
      <td data-label="Organization">{survey.organizationName}</td>
      <td data-label="Private">
        <span className={`${trackingTw.badge} ${survey.isPrivate ? "bg-app-warning-soft text-app-warning" : "bg-app-success-soft text-app-success"}`}>
          {survey.isPrivate ? "Private" : "Public"}
        </span>
      </td>
      <td data-label="Invitations">
      <div className={trackingTw.metric}>
          <strong>{survey.invitationCount}</strong>
          <span>
            {survey.invitationOpenedCount} opened • {survey.invitationCompletedCount} completed
          </span>
        </div>
      </td>
      <td data-label="Responses">
      <div className={trackingTw.metric}>
          <strong>{survey.submittedResponseCount}</strong>
          <span>{survey.inProgressResponseCount} in progress</span>
        </div>
      </td>
      <td data-label="Updated">
      <div className={adminTw.tableMeta}>
          <strong>{formatRelativeTime(survey.updatedAt)}</strong>
          <span>{formatDateTime(survey.updatedAt) ?? survey.updatedAt}</span>
        </div>
      </td>
      <td data-label="Actions">
      <div className={adminTw.tableActions}>
          <Dialog.Root
            onOpenChange={(open) => {
              if (open && !recipientsQuery.data && !recipientsQuery.isFetching) {
                void recipientsQuery.refetch();
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button size="sm" variant="secondary">
                <Mail size={15} />
                Sent to
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
        <Dialog.Overlay className={adminTw.dialogOverlay} />
        <Dialog.Content className={adminTw.dialog}>
                <Dialog.Title>Invited recipients</Dialog.Title>
          <p className={adminTw.dialogCopy}>
                  {survey.title ?? "This survey"} currently has {survey.invitationCount} tracked invitation
                  {survey.invitationCount === 1 ? "" : "s"}.
                </p>
          <div className={trackingTw.recipientList}>
                  {recipientsQuery.isLoading || recipientsQuery.isFetching ? (
              <p className={adminTw.dialogCopy}>Loading recipients...</p>
                  ) : null}
                  {!recipientsQuery.isLoading && !recipientsQuery.isFetching && (recipientsQuery.data?.length ?? 0) === 0 ? (
              <p className={adminTw.dialogCopy}>No invitation recipients have been recorded for this survey.</p>
                  ) : null}
                  {recipientsQuery.data?.map((recipient) => (
              <div className={trackingTw.recipientRow} key={recipient.id}>
                      <div>
                        <strong>{recipient.email ?? "Recipient hidden"}</strong>
                        <p>
                          {recipient.status} • Opened {recipient.firstOpenedAt ? formatRelativeTime(recipient.firstOpenedAt) : "not yet"}
                        </p>
                      </div>
                      <span>{recipient.responseCount} response{recipient.responseCount === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <Button asChild size="sm">
            <Link to={`/app/tracking-surveys/${survey.id}/responses`}>
              <Eye size={15} />
              Responses
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
};
