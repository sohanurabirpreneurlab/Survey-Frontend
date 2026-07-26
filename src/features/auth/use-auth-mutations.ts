import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { ApiError } from "../../lib/api";
import { toast } from "../../state/toast-store";
import {
  forgotPasswordRequest,
  loginRequest,
  registerRequest,
  resetPasswordRequest
} from "./auth-api";
import { authStorage } from "./auth-storage";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
  type ResetPasswordFormValues
} from "./auth-forms";
import { useAuth } from "./use-auth";

export const useRegisterForm = () =>
  useForm<RegisterFormValues>({
    defaultValues: {
      email: "",
      fullName: "",
      password: ""
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(registerSchema)
  });

export const useLoginForm = () =>
  useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: ""
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(loginSchema)
  });

export const useForgotPasswordForm = () =>
  useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: ""
    },
    resolver: zodResolver(forgotPasswordSchema)
  });

export const useResetPasswordForm = () =>
  useForm<ResetPasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      password: ""
    },
    resolver: zodResolver(resetPasswordSchema)
  });

export const useRegisterMutation = (onSuccess: () => void) =>
  useMutation({
    mutationFn: registerRequest,
    onSuccess: () => {
      toast.success("Registration submitted", "Your account is now waiting for approval.");
      onSuccess();
    }
  });

export const useLoginMutation = () => {
  const auth = useAuth();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      authStorage.write({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        refreshToken: result.refreshToken
      });
      auth.setAuthenticatedSession(result, {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        refreshToken: result.refreshToken
      });
    }
  });
};

export const useForgotPasswordMutation = () =>
  useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) => forgotPasswordRequest(email),
    onSuccess: () => {
      toast.success("Reset email sent", "If the account is eligible, password reset instructions are on the way.");
    }
  });

export const useResetPasswordMutation = () =>
  useMutation({
    mutationFn: ({ password, token }: { password: string; token: string }) =>
      resetPasswordRequest(token, password),
    onSuccess: () => {
      toast.success("Password updated", "You can now sign in with your new password.");
    }
  });

export const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  return error.message;
};
