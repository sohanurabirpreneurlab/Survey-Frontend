import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getApiErrorMessage, useForgotPasswordForm, useForgotPasswordMutation } from "../features/auth/use-auth-mutations";

export const ForgotPasswordPage = () => {
  const form = useForgotPasswordForm();
  const mutation = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await mutation.mutateAsync(values);
      setSubmitted(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  return (
    <Card className="auth-card">
      <div className="auth-card-header">
        <p className="eyebrow">Password reset</p>
        <h2>Forgot your password?</h2>
        <p>Enter your email and we will trigger the backend reset flow.</p>
      </div>

      {submitted ? (
        <InlineNotice tone="success">
          If the account is eligible, password reset instructions have been sent.
        </InlineNotice>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        <Field error={form.formState.errors.email?.message} label="Email">
          <Input autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </Field>

        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Sending..." : "Send reset instructions"}
        </Button>
      </form>

      <div className="auth-card-footer">
        <Link to="/login">Back to sign in</Link>
      </div>
    </Card>
  );
};
