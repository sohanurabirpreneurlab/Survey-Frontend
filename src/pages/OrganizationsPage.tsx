import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import {
  createAdminOrganizationRequest,
  listAdminOrganizationsRequest
} from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import type { AdminOrganizationSummary } from "../features/admin/admin.types";
import { useAuth } from "../features/auth/use-auth";
import { ApiError } from "../lib/api";
import { toast } from "../state/toast-store";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";
import { adminTw, pageTw } from "../lib/page-tailwind";

const createOrganizationSchema = z.object({
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

  const createMutation = useMutation({
    mutationFn: (name: string) => createAdminOrganizationRequest(token, name),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] })
      ]);
      toast.success("Organization created");
    },
    onError: (error) =>
      toast.danger("Create organization failed", error instanceof ApiError ? error.message : "Please try again.")
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
          <h1>Organizations</h1>
          <p>Show organizations in a table and create new organizations from a modal.</p>
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
                  <tr>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>Members</th>
                    <th>Surveys</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationsQuery.data.items.map((organization) => (
                    <OrganizationRow key={organization.organizationId} organization={organization} />
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
  const form = useForm<z.infer<typeof createOrganizationSchema>>({
    defaultValues: { name: "" },
    resolver: zodResolver(createOrganizationSchema)
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
              <button aria-label="Close create organization dialog" className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent text-app-text-soft" type="button">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className={adminTw.dialogCopy}>
            This creates a new organization record from the Admin Panel.
          </Dialog.Description>
          <form
            className={adminTw.formStack}
            onSubmit={form.handleSubmit(async (values) => {
              await onCreate(values.name);
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

const OrganizationRow = ({ organization }: { organization: AdminOrganizationSummary }) => (
  <tr>
    <td data-label="Name">
      <strong>{organization.name}</strong>
    </td>
    <td data-label="Owner">
      <div className={adminTw.tableMeta}>
        <strong>{organization.ownerName ?? "No owner"}</strong>
        <span>{organization.ownerEmail ?? "No email"}</span>
      </div>
    </td>
    <td data-label="Members">{organization.memberCount}</td>
    <td data-label="Surveys">{organization.surveyCount}</td>
    <td data-label="Updated">
      <div className={adminTw.tableMeta}>
        <strong>{formatRelativeTime(organization.updatedAt)}</strong>
        <span>{formatDateTime(organization.updatedAt) ?? organization.updatedAt}</span>
      </div>
    </td>
    <td data-label="Actions">
      <Button asChild size="sm" variant="secondary">
        <Link to={`/admin/organizations/${organization.organizationId}`}>View organization</Link>
      </Button>
    </td>
  </tr>
);
