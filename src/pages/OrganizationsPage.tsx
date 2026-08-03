import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import {
  createAdminOrganizationRequest,
  deleteAdminOrganizationRequest,
  listAdminOrganizationsRequest,
  updateAdminOrganizationRequest
} from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import type { AdminOrganizationSummary } from "../features/admin/admin.types";
import { useAuth } from "../features/auth/use-auth";
import { ApiError } from "../lib/api";
import { adminTw, pageTw } from "../lib/page-tailwind";
import { toast } from "../state/toast-store";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required.").max(120)
});

export const OrganizationsPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const organizationsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listAdminOrganizationsRequest(token, { limit: 20, page, q }),
    queryKey: adminKeys.organizations({ page, q })
  });

  const invalidateOrganizationQueries = async (organizationId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] }),
      ...(organizationId ? [queryClient.invalidateQueries({ queryKey: adminKeys.organization(organizationId) })] : [])
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => createAdminOrganizationRequest(token, name),
    onSuccess: async () => {
      await invalidateOrganizationQueries();
      toast.success("Organization created");
    },
    onError: (error) =>
      toast.danger("Create organization failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, organizationId }: { name: string; organizationId: string }) =>
      updateAdminOrganizationRequest(token, organizationId, name),
    onSuccess: async (_, variables) => {
      await invalidateOrganizationQueries(variables.organizationId);
      toast.success("Organization updated");
    },
    onError: (error) =>
      toast.danger("Update organization failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const deleteMutation = useMutation({
    mutationFn: (organizationId: string) => deleteAdminOrganizationRequest(token, organizationId),
    onSuccess: async () => {
      await invalidateOrganizationQueries();
      toast.success("Organization deleted");
    },
    onError: (error) =>
      toast.danger("Delete organization failed", error instanceof ApiError ? error.message : "Please try again.")
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
      <section className={`${pageTw.hero} ${pageTw.heroSplit}`}>
        <div>
          <h1 className={pageTw.heroTitle}>Organizations</h1>
          <p className={pageTw.muted}>Manage organization records from one table with create, edit, and delete actions.</p>
        </div>
        <CreateOrganizationDialog
          isPending={createMutation.isPending}
          onCreate={(name) => createMutation.mutateAsync(name)}
        />
      </section>

      <Card className={adminTw.filterCard}>
        <label className={adminTw.searchField}>
          <Search size={16} />
          <input
            className={adminTw.searchInput}
            onChange={(event) => updateFilters({ page: "1", q: event.target.value })}
            placeholder="Search organizations"
            value={q}
          />
        </label>
      </Card>

      {organizationsQuery.isLoading ? (
        <Card className={pageTw.empty}>
          <p>Loading organizations...</p>
        </Card>
      ) : null}

      {organizationsQuery.isError ? (
        <Card className={pageTw.empty}>
          <div>
            <h2>We could not load organizations.</h2>
            <p>Try again from this page.</p>
          </div>
          <Button onClick={() => void organizationsQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!organizationsQuery.isLoading && !organizationsQuery.isError && organizationsQuery.data ? (
        <>
          <Card className={adminTw.tableCard}>
            <div className={adminTw.tableWrap}>
              <table className={adminTw.table}>
                <thead>
                  <tr className={adminTw.tableRow}>
                    <th className={adminTw.tableHeadCell}>Name</th>
                    <th className={adminTw.tableHeadCell}>Total member</th>
                    <th className={adminTw.tableHeadCell}>Total surveys</th>
                    <th className={adminTw.tableHeadCell}>Updated</th>
                    <th className={adminTw.tableHeadCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationsQuery.data.items.map((organization) => (
                    <OrganizationRow
                      deletePending={deleteMutation.isPending}
                      key={organization.organizationId}
                      onDelete={() => deleteMutation.mutateAsync(organization.organizationId)}
                      onUpdate={(name) =>
                        updateMutation.mutateAsync({ name, organizationId: organization.organizationId })
                      }
                      organization={organization}
                      updatePending={updateMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className={adminTw.pagination}>
            <span>
              Page {organizationsQuery.data.pagination.page} of {organizationsQuery.data.pagination.totalPages}
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
                disabled={page >= organizationsQuery.data.pagination.totalPages}
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

const CreateOrganizationDialog = ({
  isPending,
  onCreate
}: {
  isPending: boolean;
  onCreate: (name: string) => Promise<unknown>;
}) => {
  const form = useForm<z.infer<typeof organizationSchema>>({
    defaultValues: { name: "" },
    resolver: zodResolver(organizationSchema)
  });

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button>Create organization</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={adminTw.dialogOverlay} />
        <Dialog.Content className={adminTw.dialog}>
          <div className={adminTw.actionRow}>
            <Dialog.Title>Create organization</Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close create organization dialog"
                className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent text-app-text-soft"
                type="button"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className={adminTw.dialogCopy}>
            New organization names are stored in lowercase and must be unique.
          </Dialog.Description>
          <form
            className={adminTw.formStack}
            onSubmit={form.handleSubmit(async (values) => {
              await onCreate(values.name.toLowerCase());
              form.reset({ name: "" });
            })}
          >
            <Field error={form.formState.errors.name?.message} label="Organization name">
              <Input {...form.register("name")} />
            </Field>
            <div className={adminTw.dialogActions}>
              <Dialog.Close asChild>
                <Button size="sm" type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button disabled={isPending} size="sm" type="submit">
                {isPending ? "Creating..." : "Create organization"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const OrganizationRow = ({
  deletePending,
  onDelete,
  onUpdate,
  organization,
  updatePending
}: {
  deletePending: boolean;
  onDelete: () => Promise<unknown>;
  onUpdate: (name: string) => Promise<unknown>;
  organization: AdminOrganizationSummary;
  updatePending: boolean;
}) => {
  const form = useForm<z.infer<typeof organizationSchema>>({
    defaultValues: { name: organization.name },
    resolver: zodResolver(organizationSchema)
  });

  return (
    <tr className={adminTw.tableRow}>
      <td className={adminTw.tableCell} data-label="Name">
        <div className={adminTw.tableMeta}>
          <strong>{organization.name}</strong>
          <span>{formatDateTime(organization.createdAt) ?? organization.createdAt}</span>
        </div>
      </td>
      <td className={adminTw.tableCell} data-label="Total member">{organization.memberCount}</td>
      <td className={adminTw.tableCell} data-label="Total surveys">{organization.surveyCount}</td>
      <td className={adminTw.tableCell} data-label="Updated">
        <div className={adminTw.tableMeta}>
          <strong>{formatRelativeTime(organization.updatedAt)}</strong>
          <span>{formatDateTime(organization.updatedAt) ?? organization.updatedAt}</span>
        </div>
      </td>
      <td className={adminTw.tableCell} data-label="Action">
        <div className={adminTw.tableActions}>
          <Button asChild size="sm" variant="secondary">
            <Link to={`/admin/organizations/${organization.organizationId}`}>View organization</Link>
          </Button>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button size="sm" variant="secondary">Edit</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={adminTw.dialogOverlay} />
              <Dialog.Content className={adminTw.dialog}>
                <div className={adminTw.actionRow}>
                  <Dialog.Title>Edit organization</Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close edit organization dialog"
                      className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent text-app-text-soft"
                      type="button"
                    >
                      <X size={18} />
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className={adminTw.dialogCopy}>
                  Update the organization name. It will be saved in lowercase and must stay unique.
                </Dialog.Description>
                <form
                  className={adminTw.formStack}
                  onSubmit={form.handleSubmit(async (values) => {
                    await onUpdate(values.name.toLowerCase());
                  })}
                >
                  <Field error={form.formState.errors.name?.message} label="Organization name">
                    <Input {...form.register("name")} />
                  </Field>
                  <div className={adminTw.dialogActions}>
                    <Dialog.Close asChild>
                      <Button size="sm" type="button" variant="secondary">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button disabled={updatePending} size="sm" type="submit">
                      {updatePending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button size="sm" variant="danger">Delete</Button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className={adminTw.dialogOverlay} />
              <AlertDialog.Content className={adminTw.dialog}>
                <AlertDialog.Title>Delete organization</AlertDialog.Title>
                <AlertDialog.Description className={adminTw.dialogCopy}>
                  Only empty organizations can be deleted. Organizations with members or surveys will be blocked.
                </AlertDialog.Description>
                <div className={adminTw.dialogActions}>
                  <AlertDialog.Cancel asChild>
                    <Button size="sm" type="button" variant="secondary">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <Button
                    disabled={deletePending}
                    onClick={() => void onDelete()}
                    size="sm"
                    type="button"
                    variant="danger"
                  >
                    {deletePending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </td>
    </tr>
  );
};
