import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  ExternalLink,
  FileClock,
  FilePlus2,
  FolderKanban,
  Globe2,
  Layers3,
  MailPlus,
  MoreHorizontal,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { toast } from "../state/toast-store";
import { useAuth } from "../features/auth/use-auth";
import {
  closeSurveyRequest,
  createDraftRequest,
  getSurveyShareRequest,
  listOrganizationsRequest,
  listSurveyInvitationsRequest,
  listSurveysRequest,
  reopenSurveyRequest,
  sendSurveyInvitationsRequest,
  updateSurveyRequest
} from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { SurveyStatusBadge } from "../features/surveys/SurveyStatusBadge";
import { accessModeLabels, ensureDateOrder, formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";
import type {
  InvitationListItem,
  OrganizationSummary,
  SurveyAccessMode,
  SurveyStatus,
  SurveySummary
} from "../features/surveys/surveys.types";

const statusTabs: Array<{ label: string; value: SurveyStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Closed", value: "closed" },
  { label: "Archived", value: "archived" }
];

const sortOptions = [
  { label: "Recently created", value: "created_desc" },
  { label: "Recently updated", value: "updated_desc" },
  { label: "Name A-Z", value: "name_asc" },
  { label: "Most responses", value: "responses_desc" }
] as const;

const compareBySort = (left: SurveySummary, right: SurveySummary, sort: string) => {
  if (sort === "updated_desc") {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }

  if (sort === "name_asc") {
    return (left.title ?? "").localeCompare(right.title ?? "");
  }

  if (sort === "responses_desc") {
    return right.submittedResponseCount - left.submittedResponseCount;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
};

const SearchSkeleton = () => (
  <div className="survey-card survey-card-skeleton">
    <div className="survey-skeleton-line survey-skeleton-line-lg" />
    <div className="survey-skeleton-line" />
    <div className="survey-skeleton-line" />
  </div>
);

const useOrganizations = (token: string) =>
  useQuery({
    enabled: Boolean(token),
    queryFn: () => listOrganizationsRequest(token),
    queryKey: surveyKeys.organizations
  });

const useSurveyList = (token: string, organizationId: string | undefined, page: number) =>
  useQuery({
    enabled: Boolean(token),
    queryFn: () => listSurveysRequest(token, { limit: 12, organizationId, page }),
    queryKey: surveyKeys.list({ organizationId, page })
  });

const toLocalDateTimeValue = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const SurveyActions = ({
  survey,
  token
}: {
  survey: SurveySummary;
  token: string;
}) => {
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [openMode, setOpenMode] = useState<"immediate" | "scheduled">(survey.opensAt ? "scheduled" : "immediate");
  const [closeMode, setCloseMode] = useState<"none" | "scheduled">(survey.closesAt ? "scheduled" : "none");
  const [opensAtValue, setOpensAtValue] = useState(toLocalDateTimeValue(survey.opensAt));
  const [closesAtValue, setClosesAtValue] = useState(toLocalDateTimeValue(survey.closesAt));
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isClosingNow, setIsClosingNow] = useState(false);

  const resetScheduleState = () => {
    setOpenMode(survey.opensAt ? "scheduled" : "immediate");
    setCloseMode(survey.closesAt ? "scheduled" : "none");
    setOpensAtValue(toLocalDateTimeValue(survey.opensAt));
    setClosesAtValue(toLocalDateTimeValue(survey.closesAt));
    setScheduleError(null);
  };

  const onCreateDraft = async () => {
    try {
      await createDraftRequest(token, survey.id);
      toast.success("Draft created", "A new draft version is ready for editing.");
      await queryClient.invalidateQueries({ queryKey: surveyKeys.all });
      setDraftDialogOpen(false);
    } catch (error) {
      toast.danger("Action failed", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const saveSchedule = async (options?: { closeImmediately?: boolean }) => {
    const nextOpensAt = openMode === "scheduled" ? opensAtValue : "";
    const nextClosesAt = closeMode === "scheduled" ? closesAtValue : "";

    if (openMode === "scheduled" && !nextOpensAt) {
      setScheduleError("Opening date and time is required when opening later is selected.");
      return;
    }

    if (closeMode === "scheduled" && !nextClosesAt) {
      setScheduleError("Closing date and time is required when scheduling a closing time.");
      return;
    }

    const nextOpensAtIso = openMode === "scheduled" ? new Date(nextOpensAt).toISOString() : null;
    const nextClosesAtIso = closeMode === "scheduled" ? new Date(nextClosesAt).toISOString() : null;

    if (!ensureDateOrder(nextOpensAtIso, nextClosesAtIso)) {
      setScheduleError("Closing time must be after opening time.");
      return;
    }

    setScheduleError(null);

    try {
      if (options?.closeImmediately) {
        setIsClosingNow(true);
      } else {
        setIsSavingSchedule(true);
      }

      await updateSurveyRequest(token, survey.id, {
        accessMode: survey.accessMode,
        closesAt: options?.closeImmediately ? null : nextClosesAtIso,
        opensAt: nextOpensAtIso,
        responseLimit: survey.responseLimit,
        slug: survey.slug
      });

      if (options?.closeImmediately) {
        await closeSurveyRequest(token, survey.id);
        toast.success("Survey closed", "Respondents can no longer submit new answers.");
      } else if (survey.status === "closed") {
        await reopenSurveyRequest(token, survey.id);
        toast.success(
          "Survey reopened",
          openMode === "scheduled"
            ? "The survey was reopened with an updated opening schedule."
            : "The survey is available again."
        );
      } else {
        toast.success("Availability updated", "Opening and closing times were updated.");
      }

      await queryClient.invalidateQueries({ queryKey: surveyKeys.all });
      setScheduleDialogOpen(false);
    } catch (error) {
      toast.danger("Action failed", error instanceof ApiError ? error.message : "Please try again.");
    } finally {
      setIsClosingNow(false);
      setIsSavingSchedule(false);
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button aria-label={`More actions for ${survey.title ?? "survey"}`} size="sm" variant="ghost">
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" className="survey-menu-content" sideOffset={6}>
            <DropdownMenu.Item asChild className="survey-menu-item">
              <Link to={`/app/surveys/${survey.id}/preview`}>
                <Eye size={15} />
                Preview
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item className="survey-menu-item" onSelect={() => setShareOpen(true)}>
              <MailPlus size={15} />
              Share
            </DropdownMenu.Item>
            {survey.currentDraftVersionId ? (
              <DropdownMenu.Item asChild className="survey-menu-item">
                <Link to={`/app/surveys/${survey.id}/builder`}>
                  <FileClock size={15} />
                  Continue editing
                </Link>
              </DropdownMenu.Item>
            ) : null}
            {survey.status === "published" && !survey.currentDraftVersionId ? (
              <DropdownMenu.Item
                className="survey-menu-item"
                onSelect={() => setDraftDialogOpen(true)}
              >
                <FilePlus2 size={15} />
                Create new draft version
              </DropdownMenu.Item>
            ) : null}
            {survey.status === "published" ? (
              <DropdownMenu.Item
                className="survey-menu-item survey-menu-item-danger"
                onSelect={() => {
                  resetScheduleState();
                  setScheduleDialogOpen(true);
                }}
              >
                <Clock3 size={15} />
                Close survey
              </DropdownMenu.Item>
            ) : null}
            {survey.status === "closed" ? (
              <DropdownMenu.Item
                className="survey-menu-item"
                onSelect={() => {
                  resetScheduleState();
                  setScheduleDialogOpen(true);
                }}
              >
                <RefreshCw size={15} />
                Reopen survey
              </DropdownMenu.Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AlertDialog.Root open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="survey-dialog">
            <AlertDialog.Title>Create draft version</AlertDialog.Title>
            <AlertDialog.Description className="survey-dialog-copy">
              Published surveys are immutable. This creates a new editable draft version from the published version.
            </AlertDialog.Description>
            <div className="survey-dialog-actions">
              <AlertDialog.Cancel asChild>
                <Button size="sm" variant="secondary">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={() => void onCreateDraft()} size="sm">
                  Create draft version
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <Dialog.Root
        onOpenChange={(open) => {
          if (!open) {
            resetScheduleState();
          }
          setScheduleDialogOpen(open);
        }}
        open={scheduleDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="survey-dialog">
            <div className="mobile-nav-header">
              <Dialog.Title>{survey.status === "closed" ? "Reopen survey" : "Close survey"}</Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label="Close scheduling dialog" className="mobile-nav-close" type="button">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <div className="share-dialog-stack">
              <p className="survey-dialog-copy">
                {survey.status === "closed"
                  ? "Update the opening and closing schedule before reopening the survey."
                  : "Choose whether the survey should keep running on a schedule or close right away."}
              </p>
              <div className="share-unpublished-state">
                <div>
                  <strong>Current schedule</strong>
                  <p className="survey-dialog-copy">Opens: {formatDateTime(survey.opensAt) ?? "Immediately"}</p>
                  <p className="survey-dialog-copy">Closes: {formatDateTime(survey.closesAt) ?? "No closing date"}</p>
                </div>
              </div>
              <div className="survey-schedule-grid">
                <Card className="survey-schedule-card">
                  <span className="field-label">Opening</span>
                  <label className="survey-radio-inline">
                    <input checked={openMode === "immediate"} onChange={() => setOpenMode("immediate")} type="radio" />
                    <span>Open immediately</span>
                  </label>
                  <label className="survey-radio-inline">
                    <input checked={openMode === "scheduled"} onChange={() => setOpenMode("scheduled")} type="radio" />
                    <span>Open later</span>
                  </label>
                  {openMode === "scheduled" ? (
                    <label className="field">
                      <span className="field-label">Opens at</span>
                      <Input onChange={(event) => setOpensAtValue(event.target.value)} type="datetime-local" value={opensAtValue} />
                    </label>
                  ) : null}
                </Card>
                <Card className="survey-schedule-card">
                  <span className="field-label">Closing</span>
                  <label className="survey-radio-inline">
                    <input checked={closeMode === "none"} onChange={() => setCloseMode("none")} type="radio" />
                    <span>No closing date</span>
                  </label>
                  <label className="survey-radio-inline">
                    <input checked={closeMode === "scheduled"} onChange={() => setCloseMode("scheduled")} type="radio" />
                    <span>Close later</span>
                  </label>
                  {closeMode === "scheduled" ? (
                    <label className="field">
                      <span className="field-label">Closes at</span>
                      <Input onChange={(event) => setClosesAtValue(event.target.value)} type="datetime-local" value={closesAtValue} />
                    </label>
                  ) : null}
                </Card>
              </div>
              {scheduleError ? <p className="field-error">{scheduleError}</p> : null}
              <div className="survey-dialog-actions">
                <Button onClick={() => setScheduleDialogOpen(false)} size="sm" variant="secondary">
                  Cancel
                </Button>
                <Button
                  disabled={isSavingSchedule || isClosingNow}
                  onClick={() => void saveSchedule()}
                  size="sm"
                >
                  {isSavingSchedule
                    ? "Saving..."
                    : survey.status === "closed"
                      ? "Save and reopen"
                      : "Save schedule"}
                </Button>
                {survey.status === "published" ? (
                  <Button
                    disabled={isSavingSchedule || isClosingNow}
                    onClick={() => void saveSchedule({ closeImmediately: true })}
                    size="sm"
                    variant="danger"
                  >
                    {isClosingNow ? "Closing..." : "Close immediately"}
                  </Button>
                ) : null}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ShareSurveyDialog onOpenChange={setShareOpen} open={shareOpen} survey={survey} token={token} />
    </>
  );
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRecipientEmails = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

const ShareSurveyDialog = ({
  open,
  onOpenChange,
  survey,
  token
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey: SurveySummary;
  token: string;
}) => {
  const queryClient = useQueryClient();
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [selectedAccessMode, setSelectedAccessMode] = useState<SurveyAccessMode>(survey.accessMode);
  const surveyId = survey.id;

  const shareQuery = useQuery({
    enabled: open && Boolean(token),
    queryFn: () => getSurveyShareRequest(token, surveyId),
    queryKey: surveyKeys.share(surveyId)
  });

  const invitationsQuery = useQuery({
    enabled: open && Boolean(token) && shareQuery.data?.accessMode === "invite_only",
    queryFn: () => listSurveyInvitationsRequest(token, surveyId),
    queryKey: surveyKeys.invitations(surveyId)
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedAccessMode(shareQuery.data?.accessMode ?? survey.accessMode);
  }, [open, shareQuery.data?.accessMode, survey.accessMode]);

  const updateShareModeMutation = useMutation({
    mutationFn: (accessMode: SurveyAccessMode) =>
      updateSurveyRequest(token, surveyId, {
        accessMode,
        closesAt: survey.closesAt,
        opensAt: survey.opensAt,
        responseLimit: survey.responseLimit,
        slug: survey.slug
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: surveyKeys.share(surveyId) }),
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
        queryClient.invalidateQueries({ queryKey: ["surveys", "list"] })
      ]);
      toast.success("Sharing method updated", "The survey sharing method has been saved.");
    },
    onError: (error) =>
      toast.danger("Update failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const sendMutation = useMutation({
    mutationFn: (emails: string[]) =>
      sendSurveyInvitationsRequest(token, surveyId, {
        recipients: emails.map((email) => ({ email }))
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.invitations(surveyId) });
      if (result.failedCount > 0) {
        toast.info(
          result.sentCount > 0 ? "Invitations partially sent" : "Invitation send incomplete",
          `${result.sentCount} sent, ${result.failedCount} failed.`
        );
      } else {
        toast.success(
          result.sentCount === 1 ? "Invitation sent" : "Invitations sent",
          `${result.sentCount} invitation${result.sentCount === 1 ? "" : "s"} sent successfully.`
        );
      }
      setRecipients(result.failedRecipients.map((recipient) => recipient.email));
      setRecipientInput("");
      setRecipientError(null);
    },
    onError: (error) =>
      toast.danger("Invitation send failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const invitationItems = invitationsQuery.data ?? [];
  const isPublished = Boolean(survey.publishedVersionId);
  const hasPendingShareModeChange = shareQuery.data
    ? selectedAccessMode !== shareQuery.data.accessMode
    : false;
  const sortedInvitations = useMemo(
    () => [...invitationItems].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [invitationItems]
  );

  const addRecipients = (rawValue: string) => {
    const parsedEmails = normalizeRecipientEmails(rawValue);

    if (parsedEmails.length === 0) {
      return;
    }

    const invalidEmails = parsedEmails.filter((email) => !emailPattern.test(email));

    if (invalidEmails.length > 0) {
      setRecipientError(`Invalid email: ${invalidEmails[0]}`);
      return;
    }

    setRecipients((current) => {
      const next = [...current];

      for (const email of parsedEmails) {
        if (!next.includes(email)) {
          next.push(email);
        }
      }

      return next;
    });
    setRecipientInput("");
    setRecipientError(null);
  };

  const handleCopyLink = async () => {
    if (!shareQuery.data?.publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareQuery.data.publicUrl);
      toast.success("Link copied");
    } catch {
      toast.danger("Copy failed", "The link could not be copied to your clipboard.");
    }
  };

  const handleOpenLink = () => {
    if (!shareQuery.data?.publicUrl) {
      return;
    }

    window.open(shareQuery.data.publicUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendInvitations = async () => {
    if (recipientInput.trim()) {
      addRecipients(recipientInput);
    }

    if (recipients.length === 0 && !recipientInput.trim()) {
      setRecipientError("Add at least one recipient email.");
      return;
    }

    const emailsToSend = recipients.length > 0 ? recipients : normalizeRecipientEmails(recipientInput);

    if (emailsToSend.length === 0) {
      setRecipientError("Add at least one recipient email.");
      return;
    }

    await sendMutation.mutateAsync(emailsToSend);
  };

  const handleUpdateSharingMethod = async () => {
    await updateShareModeMutation.mutateAsync(selectedAccessMode);
  };

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="survey-dialog">
          <div className="mobile-nav-header">
            <Dialog.Title>Share survey</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close share dialog" className="mobile-nav-close" type="button">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {shareQuery.isLoading ? (
            <div className="share-dialog-stack">
              <div className="survey-skeleton-line survey-skeleton-line-lg" />
              <div className="survey-skeleton-line" />
              <div className="survey-skeleton-line" />
            </div>
          ) : null}

          {shareQuery.isError ? (
            <div className="share-dialog-stack">
              <p className="survey-dialog-copy">We could not load sharing information.</p>
              <Button onClick={() => void shareQuery.refetch()} size="sm" variant="secondary">
                Try again
              </Button>
            </div>
          ) : null}

          {shareQuery.data ? (
            <div className="share-dialog-stack">
              <div>
                <h3 className="share-dialog-title">{shareQuery.data.title ?? "Untitled survey"}</h3>
                <p className="survey-dialog-copy">Sharing mode: {accessModeLabels[shareQuery.data.accessMode]}</p>
              </div>

              {!isPublished ? (
                <div className="share-unpublished-state">
                  <div className="share-unpublished-icon">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <strong>Publish this survey before sharing</strong>
                    <p className="survey-dialog-copy">
                      The dialog is open so you can see the sharing rules, but links and invitations stay disabled until a published version exists.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="share-dialog-stack">
                <span className="field-label">Sharing method</span>
                <div className="share-mode-grid" role="radiogroup" aria-label="Survey sharing method">
                  {([
                    {
                      hint: "Send secure invitation links to specific recipients.",
                      label: "Invitation only",
                      value: "invite_only"
                    },
                    {
                      hint: "Anyone with the public survey link can open it.",
                      label: "Public link",
                      value: "public"
                    }
                  ] as Array<{ hint: string; label: string; value: SurveyAccessMode }>).map((option) => (
                    <button
                      aria-checked={selectedAccessMode === option.value}
                      className={cn(
                        "share-mode-card",
                        !isPublished && "share-mode-card-disabled",
                        selectedAccessMode === option.value && "share-mode-card-active"
                      )}
                      disabled={!isPublished}
                      key={option.value}
                      onClick={() => setSelectedAccessMode(option.value)}
                      role="radio"
                      type="button"
                    >
                      <strong>{option.label}</strong>
                      <span>{option.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="survey-dialog-copy">
                  You can switch between public link and invitation-only access. A combined both mode is not available in the current backend.
                </p>
                {hasPendingShareModeChange ? (
                  <div className="survey-dialog-actions">
                    <Button
                      disabled={!isPublished || updateShareModeMutation.isPending}
                      onClick={() => void handleUpdateSharingMethod()}
                      size="sm"
                    >
                      {updateShareModeMutation.isPending ? "Saving..." : "Update sharing method"}
                    </Button>
                  </div>
                ) : null}
              </div>

              {isPublished && selectedAccessMode === "public" ? (
                <div className="share-dialog-stack">
                  <div className="share-link-box">
                    <span className="field-label">Public link</span>
                    <p>{shareQuery.data.publicUrl}</p>
                  </div>
                  <div className="survey-dialog-actions">
                    <Button onClick={() => void handleCopyLink()} size="sm" variant="secondary">
                      <Copy size={15} />
                      Copy link
                    </Button>
                    <Button onClick={handleOpenLink} size="sm">
                      <ExternalLink size={15} />
                      Open link
                    </Button>
                  </div>
                </div>
              ) : null}

              {isPublished && selectedAccessMode === "invite_only" ? (
                <div className="share-dialog-stack">
                  <div>
                    <span className="field-label">Invite respondents</span>
                    <p className="survey-dialog-copy">Add one or more email addresses and send invitations in one request.</p>
                  </div>

                  <div className="share-chip-box">
                    {recipients.map((recipient) => (
                      <span className="share-chip" key={recipient}>
                        {recipient}
                        <button
                          aria-label={`Remove ${recipient}`}
                          onClick={() => setRecipients((current) => current.filter((item) => item !== recipient))}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <input
                      className="share-chip-input"
                      disabled={sendMutation.isPending}
                      onChange={(event) => setRecipientInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addRecipients(recipientInput);
                        }
                      }}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text");

                        if (pasted.includes(",") || pasted.includes("\n")) {
                          event.preventDefault();
                          addRecipients(pasted);
                        }
                      }}
                      placeholder="Enter emails"
                      value={recipientInput}
                    />
                  </div>
                  {recipientError ? <p className="field-error">{recipientError}</p> : null}

                  <div className="survey-dialog-actions">
                    <Button
                      disabled={sendMutation.isPending || (recipients.length === 0 && recipientInput.trim().length === 0)}
                      onClick={() => void handleSendInvitations()}
                      size="sm"
                    >
                      {sendMutation.isPending ? "Sending..." : "Send invitations"}
                    </Button>
                  </div>

                  <div className="share-invitation-list">
                    <span className="field-label">Existing invitations</span>
                    {invitationsQuery.isLoading ? (
                      <div className="share-dialog-stack">
                        <div className="survey-skeleton-line" />
                        <div className="survey-skeleton-line" />
                      </div>
                    ) : null}
                    {!invitationsQuery.isLoading && sortedInvitations.length === 0 ? (
                      <p className="survey-dialog-copy">No invitations have been sent yet.</p>
                    ) : null}
                    {sortedInvitations.map((invitation) => (
                      <InvitationRow invitation={invitation} key={invitation.id} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const InvitationRow = ({ invitation }: { invitation: InvitationListItem }) => (
  <div className="share-invitation-row">
    <div>
      <strong>{invitation.recipientEmail ?? "Unknown recipient"}</strong>
      <p>{formatRelativeTime(invitation.createdAt)}</p>
    </div>
    <span className="survey-badge survey-badge-closed">{invitation.status}</span>
  </div>
);

const SurveyPrimaryAction = ({ survey }: { survey: SurveySummary }) => {
  if (!survey.access.canEdit) {
    return (
      <Button asChild size="sm">
        <Link to={`/app/surveys/${survey.id}/preview`}>
          Preview access
          <ArrowRight size={16} />
        </Link>
      </Button>
    );
  }

  if (survey.currentDraftVersionId) {
    return (
      <Button asChild size="sm">
        <Link to={`/app/surveys/${survey.id}/builder`}>
          Continue editing
          <ArrowRight size={16} />
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant="secondary">
      <Link to={`/app/surveys/${survey.id}/responses`}>
        View responses
        <ArrowRight size={16} />
      </Link>
    </Button>
  );
};

const SurveyAccessPill = ({ survey }: { survey: SurveySummary }) => {
  if (survey.access.isCrossOrganizationPreview) {
    return <span className="survey-access-pill survey-access-pill-warning">Cross-org preview</span>;
  }

  if (!survey.access.canEdit) {
    return <span className="survey-access-pill survey-access-pill-muted">Read only</span>;
  }

  return <span className="survey-access-pill survey-access-pill-success">Editable</span>;
};

export const SurveysPage = () => {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = auth.accessToken ?? "";
  const organizationsQuery = useOrganizations(token);
  const selectedOrganizationId = searchParams.get("organizationId") ?? organizationsQuery.data?.[0]?.organization.id;
  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") as SurveyStatus | "all" | null) ?? "all";
  const sort = searchParams.get("sort") ?? "created_desc";

  const surveysQuery = useSurveyList(token, selectedOrganizationId, page);
  const organizations = organizationsQuery.data ?? [];
  const surveys = surveysQuery.data?.items ?? [];

  const filteredSurveys = surveys
    .filter((survey) => (status === "all" ? true : survey.status === status))
    .filter((survey) => {
      if (!search.trim()) {
        return true;
      }

      return (survey.title ?? "").toLowerCase().includes(search.trim().toLowerCase());
    })
    .sort((left, right) => compareBySort(left, right, sort));

  const onFilterChange = (key: string, value: string) => {
    setSearchParams((current) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }

      if (key !== "page") {
        current.set("page", "1");
      }

      return current;
    });
  };

  const pagination = surveysQuery.data?.pagination;

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero survey-page-hero">
        <div>
          <h1>Surveys</h1>
          <p>Create, manage, publish, and review your surveys.</p>
        </div>
        <Button asChild>
          <Link to="/app/surveys/new">
            <FilePlus2 size={18} />
            Create survey
          </Link>
        </Button>
      </section>

      {organizations.length > 1 ? (
        <Card className="survey-filter-card">
          <label className="survey-select-field">
            <span className="field-label">Organization</span>
            <select
              className="input"
              onChange={(event) => onFilterChange("organizationId", event.target.value)}
              value={selectedOrganizationId}
            >
              {organizations.map((organization: OrganizationSummary) => (
                <option key={organization.organization.id} value={organization.organization.id}>
                  {organization.organization.name}
                </option>
              ))}
            </select>
          </label>
        </Card>
      ) : null}

      <Card className="survey-filter-card">
        <div className="survey-filter-grid">
          <label className="survey-search-field">
            <span className="sr-only">Search surveys</span>
            <Search size={16} />
            <input
              className="survey-search-input"
              onChange={(event) => onFilterChange("search", event.target.value)}
              placeholder="Search surveys..."
              value={search}
            />
          </label>
          <label className="survey-select-field">
            <span className="field-label">Status</span>
            <div className="survey-select-wrap">
              <select className="input" onChange={(event) => onFilterChange("status", event.target.value)} value={status}>
                {statusTabs.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
          <label className="survey-select-field">
            <span className="field-label">Sort</span>
            <div className="survey-select-wrap">
              <select className="input" onChange={(event) => onFilterChange("sort", event.target.value)} value={sort}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
        </div>
        <div className="survey-tab-row" role="tablist" aria-label="Survey status filters">
          {statusTabs.map((tab) => (
            <button
              aria-pressed={status === tab.value}
              className={cn("survey-tab", status === tab.value ? "survey-tab-active" : "")}
              key={tab.value}
              onClick={() => onFilterChange("status", tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {surveysQuery.isLoading ? (
        <section className="survey-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <SearchSkeleton key={index} />
          ))}
        </section>
      ) : null}

      {surveysQuery.isError ? (
        <Card className="dashboard-empty-state">
          <div>
            <h2>We could not load your surveys.</h2>
            <p>Try again without leaving the dashboard.</p>
          </div>
          <Button onClick={() => void surveysQuery.refetch()} type="button">
            Try again
          </Button>
        </Card>
      ) : null}

      {!surveysQuery.isLoading && !surveysQuery.isError && surveys.length === 0 ? (
        <Card className="dashboard-empty-state">
          <div>
            <p className="eyebrow">Survey workspace</p>
            <h2>No surveys yet</h2>
            <p>Create your first survey to start collecting responses.</p>
          </div>
          <Button asChild type="button">
            <Link to="/app/surveys/new">Create your first survey</Link>
          </Button>
        </Card>
      ) : null}

      {!surveysQuery.isLoading && !surveysQuery.isError && surveys.length > 0 && filteredSurveys.length === 0 ? (
        <Card className="dashboard-empty-state">
          <div>
            <h2>No surveys match your search.</h2>
            <p>Clear the search or change the selected filters.</p>
          </div>
          <Button onClick={() => setSearchParams({ page: "1", sort: "created_desc", status: "all" })} type="button" variant="secondary">
            Clear filters
          </Button>
        </Card>
      ) : null}

      {!surveysQuery.isLoading && !surveysQuery.isError && filteredSurveys.length > 0 ? (
        <section className="survey-grid">
          {filteredSurveys.map((survey) => (
            <Card className="survey-card" key={survey.id}>
              <div className="survey-card-head">
                <div>
                  <div className="survey-card-kicker">
                    <SurveyAccessPill survey={survey} />
                    <span>{accessModeLabels[survey.accessMode]}</span>
                  </div>
                  <h2>{survey.title ?? "Untitled survey"}</h2>
                  <p>{survey.description || "No description yet. Add a clear outcome-focused summary to make this card more useful."}</p>
                </div>
                <div className="survey-card-head-meta">
                  <SurveyStatusBadge status={survey.status} />
                  <SurveyActions survey={survey} token={token} />
                </div>
              </div>

              <div className="survey-card-meta">
                <span>Draft v{survey.currentDraftVersionNumber ?? "—"}</span>
                <span>Published v{survey.publishedVersionNumber ?? "—"}</span>
                <span>{survey.submittedResponseCount} responses</span>
                <span>{accessModeLabels[survey.accessMode]}</span>
              </div>

              <dl className="survey-card-stats">
                <div>
                  <dt>Updated</dt>
                  <dd>{formatRelativeTime(survey.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Opens</dt>
                  <dd>{formatDateTime(survey.opensAt) ?? "Immediately"}</dd>
                </div>
                <div>
                  <dt>Closes</dt>
                  <dd>{formatDateTime(survey.closesAt) ?? "No closing date"}</dd>
                </div>
              </dl>

              {survey.access.message ? <div className="survey-card-note">{survey.access.message}</div> : null}

              <div className="survey-card-actions">
                <SurveyPrimaryAction survey={survey} />
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/app/surveys/${survey.id}/preview`}>Preview</Link>
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <Card className="survey-pagination">
          <Button
            disabled={pagination.page <= 1}
            onClick={() => onFilterChange("page", String(pagination.page - 1))}
            size="sm"
            variant="secondary"
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          <p>
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <Button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onFilterChange("page", String(pagination.page + 1))}
            size="sm"
            variant="secondary"
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </Card>
      ) : null}

      {/* <Card className="survey-route-note">
        <FolderKanban size={18} />
        <p>
          The survey list only loads summary data. Builder details, responses, and analytics stay on their own routes.
        </p>
      </Card> */}
    </div>
  );
};
