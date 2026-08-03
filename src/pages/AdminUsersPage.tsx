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
import { adminTw, pageTw } from "../lib/page-tailwind";

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
    <div className={pageTw.page}>
      <section className={pageTw.hero}>
        <div>
          <h1 className={pageTw.heroTitle}>Users</h1>
          <p className={pageTw.muted}>Show all users in a table and let admins update platform roles safely.</p>
        </div>
      </section>

      <Card className={adminTw.filterCard}>
        <div className={adminTw.filterGrid}>
          <label className={adminTw.searchField}>
            <Search size={16} />
            <input
              className={adminTw.searchInput}
              onChange={(event) => updateFilters({ page: "1", q: event.target.value })}
              placeholder="Search by name or email"
              value={q}
            />
          </label>
          <label className={adminTw.selectField}>
            <span className={adminTw.fieldLabel}>Status</span>
            <select
              className={adminTw.select}
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
        <Card className={pageTw.empty}>
          <p>Loading users...</p>
        </Card>
      ) : null}

      {usersQuery.isError ? (
        <Card className={pageTw.empty}>
          <div>
            <h2>We could not load users.</h2>
            <p>Try the request again.</p>
          </div>
          <Button onClick={() => void usersQuery.refetch()}>Try again</Button>
        </Card>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && usersQuery.data ? (
        <>
          <Card className={adminTw.tableCard}>
            <div className={adminTw.tableWrap}>
              <table className={adminTw.table}>
                <thead>
                  <tr className={adminTw.tableRow}>
                    <th className={adminTw.tableHeadCell}>Name</th>
                    <th className={adminTw.tableHeadCell}>Email</th>
                    <th className={adminTw.tableHeadCell}>Status</th>
                    <th className={adminTw.tableHeadCell}>Organization</th>
                    <th className={adminTw.tableHeadCell}>Role</th>
                    <th className={adminTw.tableHeadCell}>Updated</th>
                    <th className={adminTw.tableHeadCell}>Actions</th>
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

          <div className={adminTw.pagination}>
            <span>
              Page {usersQuery.data.pagination.page} of {usersQuery.data.pagination.totalPages}
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
    <tr className={adminTw.tableRow}>
      <td className={adminTw.tableCell} data-label="Name">
        <strong>{user.fullName}</strong>
      </td>
      <td className={adminTw.tableCell} data-label="Email">{user.email}</td>
      <td className={adminTw.tableCell} data-label="Status">
        <span className={`rounded-full px-2.5 py-1.5 text-[0.82rem] font-bold capitalize ${statusBadgeClassName(user.accountStatus)}`}>{user.accountStatus}</span>
      </td>
      <td className={adminTw.tableCell} data-label="Organization">{user.organizationName ?? "No organization"}</td>
      <td className={adminTw.tableCell} data-label="Role">
        <div className="grid min-w-[180px] gap-1.5 max-app-mobile:min-w-0">
          <select
            className={adminTw.select}
            defaultValue={user.platformRole}
            disabled={disableRoleChange || rolePending}
            onChange={(event) => void onUpdateRole(event.target.value as "admin" | "business_owner")}
          >
            <option value="business_owner">Business owner</option>
            <option value="admin">Admin</option>
          </select>
          {disableRoleChange ? <span className="text-[0.9rem] text-app-text-faint">Current account</span> : null}
        </div>
      </td>
      <td className={adminTw.tableCell} data-label="Updated">
        <div className={adminTw.tableMeta}>
          <strong>{formatRelativeTime(user.updatedAt)}</strong>
          <span>{formatDateTime(user.updatedAt) ?? user.updatedAt}</span>
        </div>
      </td>
      <td className={adminTw.tableCell} data-label="Actions">
        <Button asChild size="sm" variant="secondary">
          <Link to={`/admin/users/${user.userId}`}>View user</Link>
        </Button>
      </td>
    </tr>
  );
};

const statusBadgeClassName = (status: AdminUserSummary["accountStatus"]) => {
  if (status === "approved") {
    return "bg-app-success-soft text-app-success";
  }

  if (status === "pending") {
    return "bg-app-warning-soft text-app-warning";
  }

  return "bg-app-surface-muted text-app-text-soft";
};
