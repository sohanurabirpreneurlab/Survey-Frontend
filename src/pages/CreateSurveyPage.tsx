import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Field, InlineNotice } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { ApiError } from "../lib/api";
import { toast } from "../state/toast-store";
import { useAuth } from "../features/auth/use-auth";
import { createSurveyRequest } from "../features/surveys/surveys.api";
import { surveyKeys } from "../features/surveys/surveys.keys";
import { createSlug, defaultSurveyVersionSettings } from "../features/surveys/surveys.utils";
import { pageTw, surveyTw } from "../lib/page-tailwind";

const createSurveySchema = z
  .object({
    accessMode: z.enum(["public", "invite_only", "authenticated", "organization_only"]),
    closesAt: z.string().optional(),
    confirmationMessage: z.string().trim().min(1).max(500),
    description: z.string().max(1000).optional(),
    openMode: z.enum(["immediate", "scheduled"]),
    opensAt: z.string().optional(),
    organizationId: z.string().uuid("Enter a valid organization ID."),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a valid hex color.")
      .default("#184fbe"),
    title: z
      .string()
      .trim()
      .min(3, "Survey title is required.")
      .max(120, "Keep the survey title under 120 characters."),
    closeMode: z.enum(["none", "scheduled"])
  })
  .superRefine((value, context) => {
    if (value.openMode === "scheduled" && !value.opensAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Opening date and time is required.",
        path: ["opensAt"]
      });
    }

    if (value.closeMode === "scheduled" && !value.closesAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closing date and time is required.",
        path: ["closesAt"]
      });
    }

    if (value.openMode === "scheduled" && value.closeMode === "scheduled" && value.opensAt && value.closesAt) {
      if (new Date(value.closesAt).getTime() <= new Date(value.opensAt).getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Closing time must be after opening time.",
          path: ["closesAt"]
        });
      }
    }
  });

type CreateSurveyValues = z.infer<typeof createSurveySchema>;

export const CreateSurveyPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";

  const form = useForm<CreateSurveyValues>({
    defaultValues: {
      accessMode: "invite_only",
      closeMode: "none",
      closesAt: "",
      confirmationMessage: "Thank you for completing this survey.",
      description: "",
      openMode: "immediate",
      opensAt: "",
      organizationId: "",
      primaryColor: "#184fbe",
      title: ""
    },
    resolver: zodResolver(createSurveySchema)
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateSurveyValues) =>
      createSurveyRequest(token, {
        accessMode: values.accessMode,
        closesAt: values.closeMode === "scheduled" ? new Date(values.closesAt ?? "").toISOString() : null,
        description: values.description?.trim() || null,
        opensAt: values.openMode === "scheduled" ? new Date(values.opensAt ?? "").toISOString() : null,
        organizationId: values.organizationId,
        settings: {
          ...defaultSurveyVersionSettings(),
          confirmationMessage: values.confirmationMessage.trim(),
          theme: {
            ...defaultSurveyVersionSettings().theme,
            primaryColor: values.primaryColor
          }
        },
        slug: createSlug(values.title),
        title: values.title.trim()
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.all });
      toast.success("Survey created", "Your initial draft is ready in the builder.");
      navigate(`/app/surveys/${result.survey.id}/builder`, { replace: true });
    },
    onError: (error) => {
      toast.danger("Create survey failed", error instanceof ApiError ? error.message : "Please try again.");
    }
  });

  const openMode = form.watch("openMode");
  const closeMode = form.watch("closeMode");
  const defaultOrganizationId = auth.organizations[0]?.organizationId ?? "";

  if (!form.getValues("organizationId") && defaultOrganizationId) {
    form.setValue("organizationId", defaultOrganizationId);
  }

  return (
    <div className={pageTw.page}>
      <section className={surveyTw.previewHeader}>
        <Button asChild size="sm" variant="ghost">
          <Link to="/app/surveys">
            <ArrowLeft size={16} />
            Back to surveys
          </Link>
        </Button>
        <div>
          <h1>Create survey</h1>
          <p>Create a basic draft first. Questions, sections, and logic belong in the builder.</p>
        </div>
      </section>

      <Card className={surveyTw.formCard}>
        <form
          className={surveyTw.form}
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          {auth.accessState === "approved" && !auth.isPlatformAdmin && auth.organizations.length === 0 ? (
            <InlineNotice tone="danger">
              Organization setup is incomplete. This account is approved but is not connected to an organization. Please review the user account in the Admin Panel.
            </InlineNotice>
          ) : null}

          <section className={surveyTw.formSection}>
            <div>
              <p className={pageTw.eyebrow}>Basic information</p>
              <h2>Survey details</h2>
            </div>
            <Field error={form.formState.errors.title?.message} label="Survey title *">
              <Input {...form.register("title")} placeholder="Customer Satisfaction Survey" />
            </Field>
            <Field error={form.formState.errors.description?.message} label="Description">
              <textarea
                className={surveyTw.textarea}
                {...form.register("description")}
                placeholder="Briefly describe the purpose of this survey..."
                rows={4}
              />
            </Field>
          </section>

          <section className={surveyTw.formSection}>
            <div>
              <p className={pageTw.eyebrow}>Access</p>
              <h2>Who can respond</h2>
            </div>
            <Field error={form.formState.errors.organizationId?.message} label="Organization ID">
              <Input
                {...form.register("organizationId")}
                placeholder="Enter organization ID"
              />
            </Field>
            <div className={surveyTw.radioGrid}>
              {[
                { hint: "Anyone with the share link can open the survey.", label: "Public link", value: "public" },
                { hint: "Best for invited respondents.", label: "Invitation only", value: "invite_only" },
                { hint: "Requires sign-in first.", label: "Authenticated users", value: "authenticated" },
                { hint: "Only members of the organization can respond.", label: "Organization only", value: "organization_only" }
              ].map((option) => (
                <label className={surveyTw.radioCard} key={option.value}>
                  <input type="radio" value={option.value} {...form.register("accessMode")} />
                  <div>
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className={surveyTw.formSection}>
            <div>
              <p className={pageTw.eyebrow}>Availability</p>
              <h2>Opening and closing schedule</h2>
            </div>

            <div className={surveyTw.scheduleGrid}>
              <Card className={surveyTw.scheduleCard}>
                <label className={surveyTw.radioInline}>
                  <input type="radio" value="immediate" {...form.register("openMode")} />
                  <span>Open immediately</span>
                </label>
                <label className={surveyTw.radioInline}>
                  <input type="radio" value="scheduled" {...form.register("openMode")} />
                  <span>Schedule opening</span>
                </label>
                {openMode === "scheduled" ? (
                  <Field error={form.formState.errors.opensAt?.message} label="Opens at">
                    <Input type="datetime-local" {...form.register("opensAt")} />
                  </Field>
                ) : null}
              </Card>

              <Card className={surveyTw.scheduleCard}>
                <label className={surveyTw.radioInline}>
                  <input type="radio" value="none" {...form.register("closeMode")} />
                  <span>No closing date</span>
                </label>
                <label className={surveyTw.radioInline}>
                  <input type="radio" value="scheduled" {...form.register("closeMode")} />
                  <span>Schedule closing</span>
                </label>
                {closeMode === "scheduled" ? (
                  <Field error={form.formState.errors.closesAt?.message} label="Closes at">
                    <Input type="datetime-local" {...form.register("closesAt")} />
                  </Field>
                ) : null}
              </Card>
            </div>

            <InlineNotice icon={<CalendarClock size={16} />}>
              Times use your local browser timezone and are submitted to the backend as ISO timestamps.
            </InlineNotice>
          </section>

          <section className={surveyTw.formSection}>
            <div>
              <p className={pageTw.eyebrow}>Confirmation</p>
              <h2>Completion message</h2>
            </div>
            <Field error={form.formState.errors.confirmationMessage?.message} label="Confirmation message">
              <textarea className={surveyTw.textarea} {...form.register("confirmationMessage")} rows={4} />
            </Field>
            <Field error={form.formState.errors.primaryColor?.message} label="Theme color">
              <div className="flex items-center justify-between gap-3">
                <Input type="color" {...form.register("primaryColor")} />
                <Input {...form.register("primaryColor")} />
              </div>
            </Field>
          </section>

          <div className={surveyTw.formFooter}>
            <InlineNotice icon={<CheckCircle2 size={16} />} tone="default">
              The builder will open next so you can add sections and questions.
            </InlineNotice>
            <div className={surveyTw.actions}>
              <Button asChild type="button" variant="secondary">
                <Link to="/app/surveys">Cancel</Link>
              </Button>
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creating survey..." : "Create survey"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
