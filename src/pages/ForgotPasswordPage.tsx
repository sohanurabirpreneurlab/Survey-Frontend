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
    <Card className="w-full max-w-[520px] p-[34px] max-app-mobile:p-[22px]">
      <div>
        <p className="mt-0 mb-3 text-[0.82rem] font-bold tracking-[0.08em] text-app-primary uppercase">Password reset</p>
        <h2 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Forgot your password?</h2>
        <p className="m-0 text-app-text-soft">Enter your email and we will trigger the backend reset flow.</p>
      </div>

      {submitted ? (
        <InlineNotice tone="success">
          If the account is eligible, password reset instructions have been sent.
        </InlineNotice>
      ) : null}

      <form className="mt-7 grid gap-[18px]" onSubmit={handleSubmit}>
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        <Field error={form.formState.errors.email?.message} label="Email">
          <Input autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </Field>

        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Sending..." : "Send reset instructions"}
        </Button>
      </form>

      <div className="mt-[26px] flex flex-wrap justify-between gap-3.5 text-app-text-soft max-app-mobile:flex-col max-app-mobile:items-stretch">
        <Link to="/login">Back to sign in</Link>
      </div>
    </Card>
  );
};
