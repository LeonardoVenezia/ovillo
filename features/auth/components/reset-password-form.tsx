"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      return;
    }
    setFormError(null);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      setDone(true);
    } catch (caught) {
      setFormError(mapAuthError(caught));
    }
  }

  const { errors, isSubmitting } = form.formState;

  if (!token || searchParams.get("error")) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{es.auth.reset.invalidTitle}</AlertTitle>
          <AlertDescription>{es.auth.reset.invalidBody}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/recuperar">{es.auth.reset.invalidCta}</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <CircleCheck />
          <AlertTitle>{es.auth.reset.doneTitle}</AlertTitle>
          <AlertDescription>{es.auth.reset.doneBody}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/ingresar">{es.auth.reset.doneCta}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">
            {es.auth.fields.newPassword}
          </FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldDescription>{es.auth.hints.password}</FieldDescription>
          <FieldError errors={[errors.password]} />
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

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? es.auth.reset.submitting : es.auth.reset.submit}
        </Button>
      </FieldGroup>
    </form>
  );
}
