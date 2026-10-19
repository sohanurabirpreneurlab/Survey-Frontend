import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, ClipboardList, FileText, RotateCcw, Search, Trash2, UserRound } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../features/auth/use-auth";
import { adminKeys } from "../features/admin/admin.keys";
import { permanentlyDeleteTrashItemRequest, listTrashRequest, restoreTrashItemRequest } from "../features/trash/trash.api";
import { trashKeys } from "../features/trash/trash.keys";
import type { TrashEntityType, TrashItem } from "../features/trash/trash.types";
import { surveyTrackingKeys } from "../features/survey-tracking/survey-tracking.keys";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";
import { ApiError } from "../lib/api";
import { adminTw, pageTw } from "../lib/page-tailwind";
import { toast } from "../state/toast-store";

const filters: Array<{ label: string; value: TrashEntityType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Surveys", value: "survey" },
  { label: "Responses", value: "response" },
  { label: "Users", value: "user" },
  { label: "Organizations", value: "organization" }
];

const entityPresentation = {
  organization: { icon: Building2, label: "Organization", tone: "bg-violet-50 text-violet-700" },
  response: { icon: ClipboardList, label: "Response", tone: "bg-amber-50 text-amber-700" },
  survey: { icon: FileText, label: "Survey", tone: "bg-blue-50 text-blue-700" },
  user: { icon: UserRound, label: "User", tone: "bg-emerald-50 text-emerald-700" }
} as const;

type PendingAction = { action: "restore" | "permanent"; item: TrashItem } | null;

export const TrashPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState<TrashEntityType | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const trashQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listTrashRequest(token, { entityType, limit: 20, page, query }),
    queryKey: trashKeys.list({ entityType, page, query })
  });

  const refreshRelatedData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trashKeys.all }),
      queryClient.invalidateQueries({ queryKey: surveyKeys.all }),
      queryClient.invalidateQueries({ queryKey: surveyTrackingKeys.all }),
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    ]);
  };

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItem) => restoreTrashItemRequest(token, item.entityType, item.id),
    onError: (error) => toast.danger("Restore failed", error instanceof ApiError ? error.message : "Please try again."),
    onSuccess: async () => {
      setPendingAction(null);
      toast.success("Item restored", "The item is available in its original workspace again.");
      await refreshRelatedData();
    }
  });

  const permanentMutation = useMutation({
    mutationFn: (item: TrashItem) => permanentlyDeleteTrashItemRequest(token, item.entityType, item.id),
    onError: (error) => toast.danger("Permanent delete failed", error instanceof ApiError ? error.message : "Please try again."),
    onSuccess: async () => {
      setPendingAction(null);
      toast.success("Item permanently deleted", "The item and its dependent stored data were removed.");
      await refreshRelatedData();
    }
  });

  const actionPending = restoreMutation.isPending || permanentMutation.isPending;
  const pagination = trashQuery.data?.pagination;

  return (
    <div className={pageTw.page}>
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <p className={pageTw.eyebrow}>Recovery center</p>
          <h1 className={pageTw.heroTitle}>Trash</h1>
          <p className={pageTw.muted}>Restore accidentally deleted records or permanently remove them when they are no longer needed.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-app-danger-soft px-4 py-2 text-sm font-semibold text-app-danger">
          <Trash2 size={16} />
          {pagination?.total ?? 0} deleted items
        </div>
      </section>

      <Card className={adminTw.filterCard}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trash type">
            {filters.map((filter) => (
              <button
                aria-pressed={entityType === filter.value}
                className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors ${entityType === filter.value ? "border-app-primary bg-app-primary-soft text-app-primary-strong" : "border-app-border bg-white text-app-text-soft hover:bg-app-surface-muted"}`}
                key={filter.value}
                onClick={() => { setEntityType(filter.value); setPage(1); }}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="flex min-h-[46px] min-w-[280px] items-center gap-2 rounded-[14px] border border-app-border bg-white px-3.5 text-app-text-soft max-app-mobile:w-full max-app-mobile:min-w-0">
            <Search size={17} />
            <Input
              className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none"
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search trash"
              value={query}
            />
          </label>
        </div>
      </Card>

      {trashQuery.isError ? (
        <Card className={pageTw.empty}>
          <h2>Trash could not be loaded.</h2>
          <Button onClick={() => void trashQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!trashQuery.isLoading && !trashQuery.isError && trashQuery.data?.items.length === 0 ? (
        <Card className={`${pageTw.empty} text-center`}>
          <Trash2 className="mx-auto mb-3 text-app-text-faint" size={34} />
          <h2 className="mb-2">Trash is empty</h2>
          <p className={pageTw.muted}>No deleted items match the selected filter.</p>
        </Card>
      ) : null}

      {trashQuery.data?.items.length ? (
        <Card className={adminTw.tableCard}>
          <div className={adminTw.tableWrap}>
            <table className={adminTw.table}>
              <thead>
                <tr>
                  <th className={adminTw.tableHeadCell}>Type</th>
                  <th className={adminTw.tableHeadCell}>Item</th>
                  <th className={adminTw.tableHeadCell}>Organization</th>
                  <th className={adminTw.tableHeadCell}>Deleted</th>
                  <th className={adminTw.tableHeadCell}>Deleted by</th>
                  <th className={adminTw.tableHeadCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashQuery.data.items.map((item) => {
                  const presentation = entityPresentation[item.entityType];
                  const Icon = presentation.icon;
                  return (
                    <tr className={adminTw.tableRow} key={`${item.entityType}-${item.id}`}>
                      <td className={adminTw.tableCell} data-label="Type">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${presentation.tone}`}>
                          <Icon size={14} /> {presentation.label}
                        </span>
                      </td>
                      <td className={adminTw.tableCell} data-label="Item">
                        <div className={adminTw.tableMeta}>
                          <strong className="break-words">{item.label}</strong>
                          {item.parentLabel ? <span>From: {item.parentLabel}</span> : null}
                          <span className="font-mono text-xs">{item.id}</span>
                        </div>
                      </td>
                      <td className={adminTw.tableCell} data-label="Organization">{item.organizationName ?? "—"}</td>
                      <td className={adminTw.tableCell} data-label="Deleted">
                        <div className={adminTw.tableMeta}>
                          <strong>{formatRelativeTime(item.deletedAt)}</strong>
                          <span>{formatDateTime(item.deletedAt) ?? item.deletedAt}</span>
                        </div>
                      </td>
                      <td className={adminTw.tableCell} data-label="Deleted by">{item.deletedByLabel ?? item.deletedBy ?? "System"}</td>
                      <td className={adminTw.tableCell} data-label="Actions">
                        <div className={adminTw.tableActions}>
                          <Button onClick={() => setPendingAction({ action: "restore", item })} size="sm" variant="secondary">
                            <RotateCcw size={15} /> Restore
                          </Button>
                          <Button onClick={() => setPendingAction({ action: "permanent", item })} size="sm" variant="danger">
                            <Trash2 size={15} /> Delete permanently
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 ? (
            <div className={`${adminTw.pagination} border-t border-app-border p-4`}>
              <span className="text-sm text-app-text-soft">Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} size="sm" variant="secondary"><ChevronLeft size={16} /> Previous</Button>
                <Button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} size="sm" variant="secondary">Next <ChevronRight size={16} /></Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <AlertDialog.Root open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !actionPending) setPendingAction(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={adminTw.dialogOverlay} />
          <AlertDialog.Content className={adminTw.dialog}>
            <AlertDialog.Title>{pendingAction?.action === "restore" ? "Restore this item?" : "Delete permanently?"}</AlertDialog.Title>
            <AlertDialog.Description className={adminTw.dialogCopy}>
              {pendingAction?.action === "restore"
                ? `${pendingAction.item.label} will return to its original workspace.`
                : `${pendingAction?.item.label ?? "This item"} and its dependent stored data will be permanently removed. This cannot be undone.`}
            </AlertDialog.Description>
            <div className={adminTw.dialogActions}>
              <AlertDialog.Cancel asChild><Button disabled={actionPending} variant="secondary">Cancel</Button></AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  disabled={actionPending || !pendingAction}
                  onClick={(event) => {
                    event.preventDefault();
                    if (!pendingAction) return;
                    if (pendingAction.action === "restore") restoreMutation.mutate(pendingAction.item);
                    else permanentMutation.mutate(pendingAction.item);
                  }}
                  variant={pendingAction?.action === "restore" ? "primary" : "danger"}
                >
                  {pendingAction?.action === "restore" ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                  {actionPending ? "Working..." : pendingAction?.action === "restore" ? "Restore item" : "Delete permanently"}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};
