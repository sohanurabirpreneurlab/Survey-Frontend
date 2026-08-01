import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import {
  approveAdminUserRequest,
  listAdminUsersRequest,
  rejectAdminUserRequest
} from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import type { AdminUserSummary } from "../features/admin/admin.types";
import { useAuth } from "../features/auth/use-auth";
import { formatDateTime } from "../features/surveys/surveys.utils";
import { ApiError } from "../lib/api";
import { toast } from "../state/toast-store";
import { adminTw, pageTw } from "../lib/page-tailwind";

const approveSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required.").max(120)
});

const rejectSchema = z.object({
  reason: z.string().trim().max(300, "Reason must be 300 characters or fewer.").optional()
});

type ApproveFormValues = z.infer<typeof approveSchema>;

export const PendingApprovalsPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const pendingQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listAdminUsersRequest(token, { limit: 20, page, q, status: "pending" }),
    queryKey: adminKeys.users({ page, q, status: "pending" })
  });

  const approveMutation = useMutation({
    mutationFn: ({ organizationName, userId }: ApproveFormValues & { userId: string }) =>
      approveAdminUserRequest(token, userId, organizationName),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: adminKeys.user(variables.userId) }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] })
      ]);
      toast.success("User approved", "The account, organization, and membership were updated.");
    },
    onError: (error) =>
      toast.danger("Approval failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reason, userId }: { reason: string | null; userId: string }) =>
      rejectAdminUserRequest(token, userId, reason),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: adminKeys.user(variables.userId) })
      ]);
      toast.success("Registration rejected");
    },
    onError: (error) =>
      toast.danger("Rejection failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const updateFilters = (next: { page?: string; q?: string }) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? "1";

    if (nextQ) {
      params.set("q", nextQ);
    }
    params.set("page", nextPage);
    setSearchParams(params);
  };

  return (
    <div className={pageTw.page}>
      <section className={pageTw.hero}>
        <div>
          <h1>Pending Approvals</h1>
          <p>Review pending registrations from `user_profiles` and `app_users` in one table.</p>
        </div>
      </section>

      <Card className={adminTw.filterCard}>
        <label className={adminTw.searchField}>
          <Search size={16} />
          <input
            className={adminTw.searchInput}
            onChange={(event) => updateFilters({ page: "1", q: event.target.value })}
            placeholder="Search by name or email"
            value={q}
          />
        </label>
      </Card>

      {pendingQuery.isLoading ? (
        <Card className={pageTw.empty}>
          <p>Loading pending approvals...</p>
        </Card>
      ) : null}

      {pendingQuery.isError ? (
        <Card className={pageTw.empty}>
          <div>
            <h2>We could not load pending approvals.</h2>
            <p>Try again without leaving the admin panel.</p>
          </div>
          <Button onClick={() => void pendingQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!pendingQuery.isLoading && !pendingQuery.isError && pendingQuery.data?.items.length === 0 ? (
        <Card className={pageTw.empty}>
          <div>
            <h2>No pending approvals</h2>
            <p>There are no registrations waiting for review.</p>
          </div>
        </Card>
      ) : null}

      {!pendingQuery.isLoading && !pendingQuery.isError && pendingQuery.data ? (
        <>
          <Card className={adminTw.tableCard}>
            <div className={adminTw.tableWrap}>
              <table className={adminTw.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Requested organization</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQuery.data.items.map((user) => (
                    <PendingApprovalRow
                      approvePending={approveMutation.isPending}
                      key={user.userId}
                      onApprove={(organizationName) =>
                        approveMutation.mutateAsync({ organizationName, userId: user.userId })
                      }
                      onReject={(reason) => rejectMutation.mutateAsync({ reason, userId: user.userId })}
                      rejectPending={rejectMutation.isPending}
                      user={user}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className={adminTw.pagination}>
            <span>
              Page {pendingQuery.data.pagination.page} of {pendingQuery.data.pagination.totalPages}
            </span>
            <div className={adminTw.actionRow}>
              <Button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: String(Math.max(1, page - 1)) })}
                size="sm"
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={page >= pendingQuery.data.pagination.totalPages}
                onClick={() => updateFilters({ page: String(page + 1) })}
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

const PendingApprovalRow = ({
  approvePending,
  onApprove,
  onReject,
  rejectPending,
  user
}: {
  approvePending: boolean;
  onApprove: (organizationName: string) => Promise<unknown>;
  onReject: (reason: string | null) => Promise<unknown>;
  rejectPending: boolean;
  user: AdminUserSummary;
}) => {
  const approveForm = useForm<ApproveFormValues>({
    defaultValues: { organizationName: user.organizationName ?? "" },
    resolver: zodResolver(approveSchema)
  });
  const rejectForm = useForm<z.infer<typeof rejectSchema>>({
    defaultValues: { reason: "" },
    resolver: zodResolver(rejectSchema)
  });

  return (
    <tr>
      <td data-label="Name">
        <strong>{user.fullName}</strong>
      </td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Requested organization">{user.organizationName ?? "Not provided"}</td>
      <td data-label="Registered">{formatDateTime(user.createdAt) ?? user.createdAt}</td>
      <td data-label="Status">
        <span className="rounded-full bg-app-warning-soft px-2.5 py-1.5 text-[0.82rem] font-bold text-app-warning capitalize">{user.accountStatus}</span>
      </td>
      <td data-label="Actions">
        <div className={adminTw.tableActions}>
          <Button asChild size="sm" variant="secondary">
            <Link to={`/admin/users/${user.userId}`}>Review</Link>
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button size="sm">Approve</Button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className={adminTw.dialogOverlay} />
              <AlertDialog.Content className={adminTw.dialog}>
                <AlertDialog.Title>Approve account</AlertDialog.Title>
                <AlertDialog.Description className={adminTw.dialogCopy}>
                  Create the organization, add the owner membership, and approve the account in one transaction.
                </AlertDialog.Description>
                <form
                  className={adminTw.formStack}
                  onSubmit={approveForm.handleSubmit(async (values) => {
                    await onApprove(values.organizationName);
                  })}
                >
                  <Field error={approveForm.formState.errors.organizationName?.message} label="Organization name">
                    <Input {...approveForm.register("organizationName")} />
                  </Field>
                  <div className={adminTw.dialogActions}>
                    <AlertDialog.Cancel asChild>
                      <Button size="sm" type="button" variant="secondary">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <Button disabled={approvePending} size="sm" type="submit">
                      {approvePending ? "Approving..." : "Approve"}
                    </Button>
                  </div>
                </form>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button size="sm" variant="danger">
                Reject
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className={adminTw.dialogOverlay} />
              <AlertDialog.Content className={adminTw.dialog}>
                <AlertDialog.Title>Reject registration</AlertDialog.Title>
                <AlertDialog.Description className={adminTw.dialogCopy}>
                  This keeps the user record and marks the registration as rejected.
                </AlertDialog.Description>
                <form
                  className={adminTw.formStack}
                  onSubmit={rejectForm.handleSubmit(async (values) => {
                    await onReject(values.reason?.trim() || null);
                  })}
                >
                  <Field error={rejectForm.formState.errors.reason?.message} label="Reason">
                    <Input {...rejectForm.register("reason")} placeholder="Optional reason" />
                  </Field>
                  <div className={adminTw.dialogActions}>
                    <AlertDialog.Cancel asChild>
                      <Button size="sm" type="button" variant="secondary">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <Button disabled={rejectPending} size="sm" type="submit" variant="danger">
                      {rejectPending ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </form>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </td>
    </tr>
  );
};
