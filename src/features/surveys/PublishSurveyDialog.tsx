import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import type { SurveyVersionDefinition } from "./surveys.types";
import { describePublishErrors, type PublishIssue } from "./publish-errors";

type Props = {
  definition: SurveyVersionDefinition;
  onPublish: () => Promise<void>;
  onEdit: (issue: PublishIssue) => void;
};
export const PublishSurveyDialog = ({ definition, onPublish, onEdit }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<PublishIssue[]>([]);
  const publish = async () => {
    setBusy(true);
    setIssues([]);
    try {
      await onPublish();
      setOpen(false);
    } catch (error) {
      setIssues(describePublishErrors(error, definition));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); if (next) setIssues([]); } }}>
      <AlertDialog.Trigger asChild><Button size="sm">Publish</Button></AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[45] bg-black/30" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[46] grid max-h-[calc(100vh-32px)] w-full max-w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-app-md border border-app-border [border-style:solid] bg-white p-6 shadow-app" aria-busy={busy}>
          <AlertDialog.Title className="m-0">{issues.length ? "Unable to publish survey" : "Publish survey"}</AlertDialog.Title>
          <AlertDialog.Description className="m-0 text-app-text-soft">
            {issues.length ? "Review the issues below, edit the affected questions or settings, and try again." : "Your survey will become available to respondents after the current draft is published."}
          </AlertDialog.Description>
          <p className="m-0 text-sm text-app-text-soft">Version {definition.version.versionNumber} · {definition.sections.length} sections · {definition.questions.length} questions</p>
          {issues.length > 0 ? (
            <ul className="m-0 grid list-none gap-3 p-0" role="alert">
              {issues.map((issue, index) => (
                <li key={index} className="grid gap-2 rounded-app-sm border border-app-border [border-style:solid] bg-app-danger-soft p-3">
                  <strong className="text-sm text-app-text [overflow-wrap:anywhere]">{issue.label}</strong>
                  <p className="m-0 text-sm text-app-danger">{issue.message}</p>
                  {(issue.questionId && issue.sectionId) || issue.scoreId ? (
                    <Button size="sm" variant="secondary" onClick={() => { setOpen(false); onEdit(issue); }}>
                      {issue.questionId ? "Edit question" : "Edit calculated scores"}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild><Button disabled={busy} size="sm" variant="secondary">{issues.length ? "Close" : "Cancel"}</Button></AlertDialog.Cancel>
            <Button disabled={busy} onClick={() => void publish()} size="sm">{busy ? "Publishing..." : issues.length ? "Retry publish" : "Publish survey"}</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
