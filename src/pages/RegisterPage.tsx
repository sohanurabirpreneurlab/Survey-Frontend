import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { listPublicOrganizationsRequest } from "../features/auth/auth-api";
import { getApiErrorMessage, useRegisterForm, useRegisterMutation } from "../features/auth/use-auth-mutations";

export const RegisterPage = () => {
  const form = useRegisterForm();
  const [completed, setCompleted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useRegisterMutation(() => setCompleted(true));
  const organizationsQuery = useQuery({
    queryFn: listPublicOrganizationsRequest,
    queryKey: ["public-organizations"]
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  if (completed) {
    return (
      <Card className="auth-card">
        <div className="state-stack">
          <div className="status-icon status-icon-success">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2>Registration submitted</h2>
            <p>
              Your account has been created in a pending state. You can return to sign in, and the app will guide you to the approval page until access is granted.
            </p>
          </div>
          <Button asChild>
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="auth-card">
      <div className="auth-card-header">
        <p className="eyebrow">Register</p>
        <h2>Create your workspace account</h2>
        <p>Business owner accounts are reviewed before full dashboard access is enabled.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        <Field error={form.formState.errors.fullName?.message} label="Full name">
          <Input autoComplete="name" placeholder="Your full name" {...form.register("fullName")} />
        </Field>

        <Field error={form.formState.errors.email?.message} label="Work email">
          <Input autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </Field>

        <Field error={form.formState.errors.organizationId?.message} label="Organization">
          <select
            className="input"
            defaultValue=""
            disabled={organizationsQuery.isLoading || organizationsQuery.isError}
            {...form.register("organizationId")}
          >
            <option value="">Select organization</option>
            {organizationsQuery.data?.map((organization) => (
              <option key={organization.organizationId} value={organization.organizationId}>
                {organization.organizationName}
              </option>
            ))}
          </select>
        </Field>

        {organizationsQuery.isLoading ? <InlineNotice>Loading organizations...</InlineNotice> : null}
        {organizationsQuery.isError ? (
          <InlineNotice tone="danger">Organizations could not be loaded. Try refreshing the page.</InlineNotice>
        ) : null}
        {!organizationsQuery.isLoading && !organizationsQuery.isError && organizationsQuery.data?.length === 0 ? (
          <InlineNotice tone="danger">No organizations are available for registration yet.</InlineNotice>
        ) : null}

        <Field
          error={form.formState.errors.password?.message}
          hint="Use 10+ characters with uppercase, lowercase, a number, and a symbol."
          label="Password"
        >
          <Input autoComplete="new-password" placeholder="Create a secure password" type="password" {...form.register("password")} />
        </Field>

        <Button
          disabled={mutation.isPending || organizationsQuery.isLoading || organizationsQuery.isError || organizationsQuery.data?.length === 0}
          type="submit"
        >
          {mutation.isPending ? "Submitting..." : "Create account"}
        </Button>
      </form>

      <div className="auth-card-footer">
        <span>
          Already registered? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </Card>
  );
};
