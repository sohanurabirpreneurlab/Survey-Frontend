import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getApiErrorMessage, useLoginForm, useLoginMutation } from "../features/auth/use-auth-mutations";

export const LoginPage = () => {
  const form = useLoginForm();
  const mutation = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      const result = await mutation.mutateAsync(values);
      const from = (location.state as { from?: string } | null)?.from;

      if (result.accessState === "approved") {
        navigate(from && from.startsWith("/app") ? from : "/app", { replace: true });
        return;
      }

      navigate(
        result.accessState === "pending_approval"
          ? "/pending-approval"
          : result.accessState === "rejected"
            ? "/account-rejected"
            : "/account-suspended",
        { replace: true }
      );
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  return (
    <Card className="auth-card">
      <div className="auth-card-header">
        <p className="eyebrow">Sign in</p>
        <h2>Welcome back</h2>
        <p>Use your business owner account to access the survey dashboard.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {formError ? (
          <InlineNotice icon={<ShieldCheck size={16} />} tone="danger">
            {formError}
          </InlineNotice>
        ) : null}

        <Field error={form.formState.errors.email?.message} label="Email">
          <Input autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </Field>

        <Field error={form.formState.errors.password?.message} label="Password">
          <Input autoComplete="current-password" placeholder="Enter your password" type="password" {...form.register("password")} />
        </Field>

        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="auth-card-footer">
        <span>
          New here? <Link to="/register">Create an account</Link>
        </span>
      </div>
    </Card>
  );
};
