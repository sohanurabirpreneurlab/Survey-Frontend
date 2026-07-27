import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { updateAdminUserRoleRequest, listAdminUsersRequest } from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import type { AdminUserSummary } from "../features/admin/admin.types";
import { useAuth } from "../features/auth/use-auth";
import { ApiError } from "../lib/api";
import { toast } from "../state/toast-store";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";

export const AdminUsersPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";

  const usersQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listAdminUsersRequest(token, { limit: 20, page, q, status: status || undefined }),
    queryKey: adminKeys.users({ page, q, status })
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ platformRole, userId }: { platformRole: "admin" | "business_owner"; userId: string }) =>
      updateAdminUserRoleRequest(token, userId, platformRole),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: adminKeys.user(variables.userId) })
      ]);
      toast.success("Role updated", "The platform role change has been saved.");
    },
    onError: (error) =>
      toast.danger("Role update failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const updateFilters = (next: { page?: string; q?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? "1";

    if (nextQ) {
      params.set("q", nextQ);
    }
    if (nextStatus) {
      params.set("status", nextStatus);
    }
    params.set("page", nextPage);
    setSearchParams(params);
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <h1>Users</h1>
          <p>Show all users in a table and let admins update platform roles safely.</p>
        </div>
      </section>

      <Card className="survey-filter-card">
        <div className="survey-filter-grid admin-filter-grid">
          <label className="survey-search-field">
            <Search size={16} />
            <input
              className="survey-search-input"
              onChange={(event) => updateFilters({ page: "1", q: event.target.value })}
              placeholder="Search by name or email"
              value={q}
            />
          </label>
          <label className="survey-select-field">
            <span className="field-label">Status</span>
            <select
              className="input"
              onChange={(event) => updateFilters({ page: "1", status: event.target.value })}
              value={status}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>
      </Card>

      {usersQuery.isLoading ? (
        <Card className="dashboard-empty-state">
          <p>Loading users...</p>
        </Card>
      ) : null}

      {usersQuery.isError ? (
        <Card className="dashboard-empty-state">
          <div>
            <h2>We could not load users.</h2>
            <p>Try the request again.</p>
          </div>
          <Button onClick={() => void usersQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && usersQuery.data ? (
        <>
          <Card className="admin-table-card">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Organization</th>
                    <th>Role</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data.items.map((user) => (
                    <AdminUserRow
                      currentUserId={auth.user?.id ?? null}
                      key={user.userId}
                      onUpdateRole={(platformRole) =>
                        updateRoleMutation.mutateAsync({ platformRole, userId: user.userId })
                      }
                      rolePending={updateRoleMutation.isPending}
                      user={user}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="survey-pagination">
            <span>
              Page {usersQuery.data.pagination.page} of {usersQuery.data.pagination.totalPages}
            </span>
            <div className="survey-card-actions">
              <Button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: String(Math.max(1, page - 1)) })}
                size="sm"
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={page >= usersQuery.data.pagination.totalPages}
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

const AdminUserRow = ({
  currentUserId,
  onUpdateRole,
  rolePending,
  user
}: {
  currentUserId: string | null;
  onUpdateRole: (platformRole: "admin" | "business_owner") => Promise<unknown>;
  rolePending: boolean;
  user: AdminUserSummary;
}) => {
  const disableRoleChange = currentUserId === user.userId;

  return (
    <tr>
      <td data-label="Name">
        <strong>{user.fullName}</strong>
      </td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Status">
        <span className={`survey-badge ${statusBadgeClassName(user.accountStatus)}`}>{user.accountStatus}</span>
      </td>
      <td data-label="Organization">{user.organizationName ?? "No organization"}</td>
      <td data-label="Role">
        <div className="admin-role-editor">
          <select
            className="input"
            defaultValue={user.platformRole}
            disabled={disableRoleChange || rolePending}
            onChange={(event) => void onUpdateRole(event.target.value as "admin" | "business_owner")}
          >
            <option value="business_owner">Business owner</option>
            <option value="admin">Admin</option>
          </select>
          {disableRoleChange ? <span className="field-hint">Current account</span> : null}
        </div>
      </td>
      <td data-label="Updated">
        <div className="admin-table-meta">
          <strong>{formatRelativeTime(user.updatedAt)}</strong>
          <span>{formatDateTime(user.updatedAt) ?? user.updatedAt}</span>
        </div>
      </td>
      <td data-label="Actions">
        <Button asChild size="sm" variant="secondary">
          <Link to={`/admin/users/${user.userId}`}>View user</Link>
        </Button>
      </td>
    </tr>
  );
};

const statusBadgeClassName = (status: AdminUserSummary["accountStatus"]) => {
  if (status === "approved") {
    return "survey-badge-published";
  }

  if (status === "pending") {
    return "survey-badge-draft";
  }

  return "survey-badge-closed";
};
