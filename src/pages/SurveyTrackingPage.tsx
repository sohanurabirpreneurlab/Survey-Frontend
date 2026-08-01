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
    <div className="grid gap-6">
      <section className="flex items-start justify-between gap-4 rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:flex-col max-app-mobile:items-stretch max-app-mobile:p-[22px]">
        <div>
          <h1 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Tracking Survey</h1>
          <p className="m-0 text-app-text-soft">
            {auth.isPlatformAdmin
              ? "Monitor all surveys, invitation reach, and response progress across the platform."
              : "Monitor surveys from your organization, invited recipients, and filled responses."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-app-border [border-style:solid] bg-white/90 px-3 py-2 text-[0.86rem] font-bold text-app-text-soft">
            <Users size={14} />
            Response tracking
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-app-border [border-style:solid] bg-white/90 px-3 py-2 text-[0.86rem] font-bold text-app-text-soft">
            <Mail size={14} />
            Invitation visibility
          </span>
        </div>
      </section>

      {trackingQuery.isLoading ? (
        <Card className="rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:p-[22px]">
          <p className="m-0 text-app-text-soft">Loading tracked surveys...</p>
        </Card>
      ) : null}

      {trackingQuery.isError ? (
        <Card className="grid gap-4 rounded-app-lg border border-[rgba(216,225,239,0.92)] [border-style:solid] bg-white/[0.85] p-7 max-app-mobile:p-[22px]">
          <div>
            <h2 className="mt-0 mb-2">We could not load tracking data.</h2>
            <p className="m-0 text-app-text-soft">Try the request again.</p>
          </div>
          <Button onClick={() => void trackingQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!trackingQuery.isLoading && !trackingQuery.isError && trackingQuery.data ? (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse [&_th]:bg-app-surface-muted [&_th]:px-[18px] [&_th]:py-4 [&_th]:text-left [&_th]:text-[0.82rem] [&_th]:font-bold [&_th]:tracking-[0.06em] [&_th]:text-app-text-faint [&_th]:uppercase [&_td]:border-b [&_td]:border-app-border [&_td]:px-[18px] [&_td]:py-4 [&_td]:text-left [&_td]:align-top max-app-mobile:block max-app-mobile:min-w-0 max-app-mobile:[&_thead]:hidden max-app-mobile:[&_tbody]:block max-app-mobile:[&_tr]:block max-app-mobile:[&_tr]:w-full max-app-mobile:[&_tr]:border-b max-app-mobile:[&_tr]:border-app-border max-app-mobile:[&_tr]:px-4 max-app-mobile:[&_tr]:py-3.5 max-app-mobile:[&_td]:grid max-app-mobile:[&_td]:w-full max-app-mobile:[&_td]:gap-1.5 max-app-mobile:[&_td]:border-b-0 max-app-mobile:[&_td]:px-0 max-app-mobile:[&_td]:pb-3 max-app-mobile:[&_td]:pt-0 max-app-mobile:[&_td]:before:content-[attr(data-label)] max-app-mobile:[&_td]:before:text-[0.78rem] max-app-mobile:[&_td]:before:font-bold max-app-mobile:[&_td]:before:tracking-[0.06em] max-app-mobile:[&_td]:before:text-app-text-faint max-app-mobile:[&_td]:before:uppercase">
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

          <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
            <span>
              Page {trackingQuery.data.pagination.page} of {trackingQuery.data.pagination.totalPages}
            </span>
            <div className="flex items-center justify-between gap-3 max-app-mobile:flex-col max-app-mobile:items-stretch">
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
        <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
          <strong>{survey.title ?? "Untitled survey"}</strong>
          <span>{survey.status}</span>
        </div>
      </td>
      <td data-label="Organization">{survey.organizationName}</td>
      <td data-label="Private">
        <span className={`inline-flex rounded-full px-2.5 py-1.5 text-[0.82rem] font-bold capitalize ${survey.isPrivate ? "bg-app-warning-soft text-app-warning" : "bg-app-success-soft text-app-success"}`}>
          {survey.isPrivate ? "Private" : "Public"}
        </span>
      </td>
      <td data-label="Invitations">
        <div className="grid gap-1 [&_span]:text-[0.92rem] [&_span]:text-app-text-soft">
          <strong>{survey.invitationCount}</strong>
          <span>
            {survey.invitationOpenedCount} opened • {survey.invitationCompletedCount} completed
          </span>
        </div>
      </td>
      <td data-label="Responses">
        <div className="grid gap-1 [&_span]:text-[0.92rem] [&_span]:text-app-text-soft">
          <strong>{survey.submittedResponseCount}</strong>
          <span>{survey.inProgressResponseCount} in progress</span>
        </div>
      </td>
      <td data-label="Updated">
        <div className="grid gap-0.5 [&_span]:text-[0.9rem] [&_span]:text-app-text-soft">
          <strong>{formatRelativeTime(survey.updatedAt)}</strong>
          <span>{formatDateTime(survey.updatedAt) ?? survey.updatedAt}</span>
        </div>
      </td>
      <td data-label="Actions">
        <div className="flex flex-wrap gap-2 max-app-mobile:w-full max-app-mobile:[&_[data-slot=button]]:w-full">
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
              <Dialog.Overlay className="fixed inset-0 z-[45] bg-[rgba(18,48,79,0.32)]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 z-[46] grid max-h-[min(720px,calc(100vh-32px))] w-full max-w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-app-md border border-app-border [border-style:solid] bg-white p-6 shadow-app">
                <Dialog.Title className="m-0 text-xl font-bold">Invited recipients</Dialog.Title>
                <p className="m-0 text-app-text-soft">
                  {survey.title ?? "This survey"} currently has {survey.invitationCount} tracked invitation
                  {survey.invitationCount === 1 ? "" : "s"}.
                </p>
                <div className="grid max-h-[360px] gap-3 overflow-auto">
                  {recipientsQuery.isLoading || recipientsQuery.isFetching ? (
                    <p className="m-0 text-app-text-soft">Loading recipients...</p>
                  ) : null}
                  {!recipientsQuery.isLoading && !recipientsQuery.isFetching && (recipientsQuery.data?.length ?? 0) === 0 ? (
                    <p className="m-0 text-app-text-soft">No invitation recipients have been recorded for this survey.</p>
                  ) : null}
                  {recipientsQuery.data?.map((recipient) => (
                    <div className="flex items-center justify-between gap-4 rounded-app-md border border-app-border [border-style:solid] px-4 py-3.5 max-app-mobile:flex-col max-app-mobile:items-start" key={recipient.id}>
                      <div>
                        <strong>{recipient.email ?? "Recipient hidden"}</strong>
                        <p className="mt-1 mb-0 text-sm text-app-text-soft">
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
