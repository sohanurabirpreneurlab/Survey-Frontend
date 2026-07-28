import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { ApiError } from "../lib/api";
import { toast } from "../state/toast-store";
import { useAuth } from "../features/auth/use-auth";
import {
  approveAdminUserRequest,
  getAdminUserRequest,
  listAdminOrganizationsRequest,
  reactivateAdminUserRequest,
  rejectAdminUserRequest,
  suspendAdminUserRequest
  ,
  updateAdminUserProfileRequest
} from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import { formatDateTime, formatRelativeTime } from "../features/surveys/surveys.utils";

const approveSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required.").max(120)
});

const reasonSchema = z.object({
  reason: z.string().trim().max(300).optional()
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(120),
  organizationId: z.string().uuid("Select a valid organization.").nullable()
});

export const AdminUserDetailsPage = () => {
  const { userId = "" } = useParams();
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getAdminUserRequest(token, userId),
    queryKey: adminKeys.user(userId)
  });
  const organizationsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: async () => {
      const result = await listAdminOrganizationsRequest(token, { limit: 100, page: 1 });
      return result.items;
    },
    queryKey: adminKeys.organizations({ limit: 100, page: 1 })
  });

  const approveForm = useForm<z.infer<typeof approveSchema>>({
    defaultValues: { organizationName: "" },
    resolver: zodResolver(approveSchema)
  });
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    defaultValues: { fullName: "", organizationId: null },
    resolver: zodResolver(profileSchema)
  });
  const reasonForm = useForm<z.infer<typeof reasonSchema>>({
    defaultValues: { reason: "" },
    resolver: zodResolver(reasonSchema)
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.users({}) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations({}) })
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: (organizationName: string) => approveAdminUserRequest(token, userId, organizationName),
    onSuccess: async () => {
      await invalidate();
      toast.success("User approved", "Organization and membership were created in the same operation.");
    },
    onError: (error) =>
      toast.danger("Approval failed", error instanceof ApiError ? error.message : "Please try again.")
  });
  const rejectMutation = useMutation({
    mutationFn: (reason: string | null) => rejectAdminUserRequest(token, userId, reason),
    onSuccess: async () => {
      await invalidate();
      toast.success("Registration rejected");
    }
  });
  const suspendMutation = useMutation({
    mutationFn: (reason: string | null) => suspendAdminUserRequest(token, userId, reason),
    onSuccess: async () => {
      await invalidate();
      toast.success("Account suspended");
    }
  });
  const reactivateMutation = useMutation({
    mutationFn: () => reactivateAdminUserRequest(token, userId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Account reactivated");
    }
  });
  const updateProfileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) =>
      updateAdminUserProfileRequest(token, userId, values),
    onSuccess: async () => {
      await invalidate();
      toast.success("User updated", "Name and organization details were saved.");
    },
    onError: (error) =>
      toast.danger("Update failed", error instanceof ApiError ? error.message : "Please try again.")
  });

  const detail = userQuery.data;

  if (detail && !approveForm.getValues("organizationName")) {
    approveForm.setValue("organizationName", detail.user.organizationName ?? "");
  }

  if (detail && !profileForm.getValues("fullName")) {
    profileForm.reset({
      fullName: detail.user.fullName,
      organizationId: detail.user.organizationId ?? null
    });
  }

  if (userQuery.isLoading || !detail) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Loading user review...</h1>
        </section>
      </div>
    );
  }

  const user = detail.user;

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero survey-page-hero">
        <div>
          <h1>{user.fullName}</h1>
          <p>{user.email}</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/admin/users">Back to users</Link>
        </Button>
      </section>

      <section className="survey-grid">
        <Card className="survey-card">
          <h2>Account</h2>
          <form
            className="builder-settings-stack"
            onSubmit={profileForm.handleSubmit(async (values) => {
              await updateProfileMutation.mutateAsync(values);
            })}
          >
            <Field error={profileForm.formState.errors.fullName?.message} label="Full name">
              <Input {...profileForm.register("fullName")} />
            </Field>
            <Field error={profileForm.formState.errors.organizationId?.message} label="Organization">
              <select
                className="input"
                {...profileForm.register("organizationId", {
                  setValueAs: (value) => (value ? value : null)
                })}
              >
                <option value="">No organization</option>
                {organizationsQuery.data?.map((organization) => (
                  <option key={organization.organizationId} value={organization.organizationId}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="survey-dialog-actions">
              <Button disabled={updateProfileMutation.isPending} size="sm" type="submit">
                {updateProfileMutation.isPending ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>
          <div className="settings-details">
            <div className="settings-item">
              <span className="settings-label">Status</span>
              <strong>{user.accountStatus}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Platform role</span>
              <strong>{user.platformRole}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Organization</span>
              <strong>{user.organizationName ?? "Not provided"}</strong>
            </div>
            <div className="settings-item">
              <span className="settings-label">Registered</span>
              <strong>{formatDateTime(user.createdAt) ?? user.createdAt}</strong>
            </div>
          </div>
        </Card>

        <Card className="survey-card">
          <h2>Actions</h2>
          <div className="survey-dialog-actions">
            {user.accountStatus === "pending" ? (
              <>
                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <Button size="sm">Approve account</Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="dialog-overlay" />
                    <AlertDialog.Content className="survey-dialog">
                      <AlertDialog.Title>Approve account</AlertDialog.Title>
                      <AlertDialog.Description className="survey-dialog-copy">
                        This action creates the organization, creates the membership, approves dashboard access, and records audit events in one transaction.
                      </AlertDialog.Description>
                      <form
                        className="builder-settings-stack"
                        onSubmit={approveForm.handleSubmit(async (values) => {
                          await approveMutation.mutateAsync(values.organizationName);
                        })}
                      >
                        <Field error={approveForm.formState.errors.organizationName?.message} label="Organization name">
                          <Input {...approveForm.register("organizationName")} />
                        </Field>
                        <div className="survey-dialog-actions">
                          <AlertDialog.Cancel asChild>
                            <Button size="sm" type="button" variant="secondary">
                              Cancel
                            </Button>
                          </AlertDialog.Cancel>
                          <Button disabled={approveMutation.isPending} size="sm" type="submit">
                            {approveMutation.isPending ? "Approving..." : "Approve account"}
                          </Button>
                        </div>
                      </form>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>

                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <Button size="sm" variant="danger">Reject registration</Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="dialog-overlay" />
                    <AlertDialog.Content className="survey-dialog">
                      <AlertDialog.Title>Reject registration</AlertDialog.Title>
                      <AlertDialog.Description className="survey-dialog-copy">
                        This preserves the user record but blocks application access.
                      </AlertDialog.Description>
                      <form
                        className="builder-settings-stack"
                        onSubmit={reasonForm.handleSubmit(async (values) => {
                          await rejectMutation.mutateAsync(values.reason?.trim() || null);
                        })}
                      >
                        <Field error={reasonForm.formState.errors.reason?.message} label="Reason">
                          <Input {...reasonForm.register("reason")} placeholder="Optional reason" />
                        </Field>
                        <div className="survey-dialog-actions">
                          <AlertDialog.Cancel asChild>
                            <Button size="sm" type="button" variant="secondary">
                              Cancel
                            </Button>
                          </AlertDialog.Cancel>
                          <Button disabled={rejectMutation.isPending} size="sm" type="submit" variant="danger">
                            Reject registration
                          </Button>
                        </div>
                      </form>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>
              </>
            ) : null}

            {user.accountStatus === "approved" ? (
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild>
                  <Button size="sm" variant="danger">Suspend account</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal>
                  <AlertDialog.Overlay className="dialog-overlay" />
                  <AlertDialog.Content className="survey-dialog">
                    <AlertDialog.Title>Suspend account</AlertDialog.Title>
                    <AlertDialog.Description className="survey-dialog-copy">
                      Are you sure you want to suspend this account? The user will lose application access until reactivated.
                    </AlertDialog.Description>
                    <div className="survey-dialog-actions">
                      <AlertDialog.Cancel asChild>
                        <Button size="sm" type="button" variant="secondary">
                          Cancel
                        </Button>
                      </AlertDialog.Cancel>
                      <AlertDialog.Action asChild>
                        <Button
                          disabled={suspendMutation.isPending}
                          onClick={() => void suspendMutation.mutateAsync(null)}
                          size="sm"
                          variant="danger"
                        >
                          {suspendMutation.isPending ? "Suspending..." : "Yes, suspend"}
                        </Button>
                      </AlertDialog.Action>
                    </div>
                  </AlertDialog.Content>
                </AlertDialog.Portal>
              </AlertDialog.Root>
            ) : null}
            {user.accountStatus === "suspended" ? (
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild>
                  <Button size="sm">Reactivate account</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal>
                  <AlertDialog.Overlay className="dialog-overlay" />
                  <AlertDialog.Content className="survey-dialog">
                    <AlertDialog.Title>Reactivate account</AlertDialog.Title>
                    <AlertDialog.Description className="survey-dialog-copy">
                      Are you sure you want to reactivate this account? The user will regain access immediately.
                    </AlertDialog.Description>
                    <div className="survey-dialog-actions">
                      <AlertDialog.Cancel asChild>
                        <Button size="sm" type="button" variant="secondary">
                          Cancel
                        </Button>
                      </AlertDialog.Cancel>
                      <AlertDialog.Action asChild>
                        <Button
                          disabled={reactivateMutation.isPending}
                          onClick={() => void reactivateMutation.mutateAsync()}
                          size="sm"
                        >
                          {reactivateMutation.isPending ? "Reactivating..." : "Yes, reactivate"}
                        </Button>
                      </AlertDialog.Action>
                    </div>
                  </AlertDialog.Content>
                </AlertDialog.Portal>
              </AlertDialog.Root>
            ) : null}
          </div>
        </Card>
      </section>

      {user.platformRole === "business_owner" && user.memberships.length === 0 && user.accountStatus === "approved" ? (
        <InlineNotice tone="danger">
          Organization setup is incomplete. This account is approved but is not connected to an organization.
        </InlineNotice>
      ) : null}

      <Card className="survey-card">
        <h2>Organization memberships</h2>
        {user.memberships.length === 0 ? <p>No organization memberships.</p> : null}
        {user.memberships.map((membership) => (
          <div className="admin-list-row" key={membership.organizationId}>
            <div>
              <strong>{membership.organizationName}</strong>
              <p>{membership.membershipRole}</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to={`/admin/organizations/${membership.organizationId}`}>View organization</Link>
            </Button>
          </div>
        ))}
      </Card>

      <Card className="survey-card">
        <h2>Recent audit activity</h2>
        {detail.recentAudit.length === 0 ? <p>No recent audit events.</p> : null}
        {detail.recentAudit.map((log) => (
          <div className="admin-list-row" key={log.id}>
            <div>
              <strong>{log.action}</strong>
              <p>{log.targetLabel ?? log.targetId ?? "n/a"}</p>
            </div>
            <span>{formatRelativeTime(log.createdAt)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};
