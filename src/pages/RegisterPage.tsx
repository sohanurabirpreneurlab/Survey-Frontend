import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input, inputClassName } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
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
      <Card className="w-full max-w-[520px] p-[34px] max-app-mobile:p-[22px]">
        <div className="grid gap-[18px]">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-app-success-soft text-app-success">
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
    <Card className="w-full max-w-[520px] p-[34px] max-app-mobile:p-[22px]">
      <div>
        <p className="mt-0 mb-3 text-[0.82rem] font-bold tracking-[0.08em] text-app-primary uppercase">Register</p>
        <h2 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Create your workspace account</h2>
        <p className="m-0 text-app-text-soft">Business owner accounts are reviewed before full dashboard access is enabled.</p>
      </div>

      <form className="mt-7 grid gap-[18px]" onSubmit={handleSubmit}>
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        <Field error={form.formState.errors.fullName?.message} label="Full name">
          <Input autoComplete="name" placeholder="Your full name" {...form.register("fullName")} />
        </Field>

        <Field error={form.formState.errors.email?.message} label="Work email">
          <Input autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </Field>

        <Field error={form.formState.errors.organizationId?.message} label="Organization">
          <select
            className={inputClassName}
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
          <PasswordInput autoComplete="new-password" placeholder="Create a secure password" {...form.register("password")} />
        </Field>

        <Button
          disabled={mutation.isPending || organizationsQuery.isLoading || organizationsQuery.isError || organizationsQuery.data?.length === 0}
          type="submit"
        >
          {mutation.isPending ? "Submitting..." : "Create account"}
        </Button>
      </form>

      <div className="mt-[26px] flex flex-wrap justify-between gap-3.5 text-app-text-soft max-app-mobile:flex-col max-app-mobile:items-stretch">
        <span>
          Already registered? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </Card>
  );
};
