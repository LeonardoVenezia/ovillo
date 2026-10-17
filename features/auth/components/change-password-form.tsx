"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { es } from "@/messages/es";

import { mapAuthError } from "../errors";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "../schemas";

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      toast.success(es.auth.account.passwordChanged);
      form.reset();
    } catch (caught) {
      setFormError(mapAuthError(caught));
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.currentPassword ? true : undefined}>
          <FieldLabel htmlFor="currentPassword">
            {es.auth.fields.currentPassword}
          </FieldLabel>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            {...form.register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={errors.newPassword ? true : undefined}>
          <FieldLabel htmlFor="newPassword">
            {es.auth.fields.newPassword}
          </FieldLabel>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            {...form.register("newPassword")}
          />
          <FieldDescription>{es.auth.hints.password}</FieldDescription>
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={errors.confirm ? true : undefined}>
          <FieldLabel htmlFor="confirm">
            {es.auth.fields.repeatPassword}
          </FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
            {...form.register("confirm")}
          />
          <FieldError errors={[errors.confirm]} />
        </Field>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? es.auth.account.passwordSubmitting
            : es.auth.account.passwordSubmit}
        </Button>
      </FieldGroup>
    </form>
  );
}
