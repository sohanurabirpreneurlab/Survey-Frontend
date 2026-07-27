import { z } from "zod";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\S]{10,128}$/;

export const registerSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name must be 120 characters or fewer.")
    .regex(/^[A-Za-z0-9.' -]+$/, "Use letters, numbers, spaces, apostrophes, periods, or hyphens only."),
  organizationId: z.string().uuid("Select an organization."),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .max(128, "Password must be 128 characters or fewer.")
    .regex(passwordPattern, "Use uppercase, lowercase, number, special character, and no spaces.")
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.").max(128, "Password is too long.").refine((value) => !/\s/.test(value), {
    message: "Password cannot contain spaces."
  })
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address.")
});

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Please confirm your password."),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .max(128, "Password must be 128 characters or fewer.")
      .regex(passwordPattern, "Use uppercase, lowercase, number, special character, and no spaces.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
