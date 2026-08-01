import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getApiErrorMessage, useResetPasswordForm, useResetPasswordMutation } from "../features/auth/use-auth-mutations";

const useRecoveryToken = () => {
  const location = useLocation();

  return useMemo(() => {
    const queryToken = new URLSearchParams(location.search).get("access_token");
    if (queryToken) {
      return queryToken;
    }

    const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
    const hashToken = new URLSearchParams(hash).get("access_token");
    return hashToken ?? "";
  }, [location.hash, location.search]);
};

export const ResetPasswordPage = () => {
  const token = useRecoveryToken();
  const form = useResetPasswordForm();
  const mutation = useResetPasswordMutation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await mutation.mutateAsync({ password: values.password, token });
      navigate("/login", { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  return (
    <Card className="w-full max-w-[520px] p-[34px] max-app-mobile:p-[22px]">
      <div>
        <p className="mt-0 mb-3 text-[0.82rem] font-bold tracking-[0.08em] text-app-primary uppercase">Choose a new password</p>
        <h2 className="mt-0 mb-2.5 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.1]">Reset your password</h2>
        <p className="m-0 text-app-text-soft">Create a new secure password for your account.</p>
      </div>

      {!token ? (
        <InlineNotice tone="danger">
          This reset link is missing a recovery token. Request a new password reset email.
        </InlineNotice>
      ) : null}

      <form className="mt-7 grid gap-[18px]" onSubmit={handleSubmit}>
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        <Field
          error={form.formState.errors.password?.message}
          hint="Use 10+ characters with uppercase, lowercase, a number, and a symbol."
          label="New password"
        >
          <Input autoComplete="new-password" type="password" {...form.register("password")} />
        </Field>

        <Field error={form.formState.errors.confirmPassword?.message} label="Confirm password">
          <Input autoComplete="new-password" type="password" {...form.register("confirmPassword")} />
        </Field>

        <Button disabled={!token || mutation.isPending} type="submit">
          {mutation.isPending ? "Updating..." : "Update password"}
        </Button>
      </form>

      <div className="mt-[26px] flex flex-wrap justify-between gap-3.5 text-app-text-soft max-app-mobile:flex-col max-app-mobile:items-stretch">
        <Link to="/forgot-password">Request another reset link</Link>
      </div>
    </Card>
  );
};
