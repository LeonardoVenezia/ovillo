"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { es } from "@/messages/es";

import { mapAuthError } from "../errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: values.email.trim(),
        redirectTo: `${window.location.origin}/restablecer`,
      });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      // Respuesta neutra siempre: no confirmamos si el email existe o no.
      setSent(true);
    } catch (caught) {
      setFormError(mapAuthError(caught));
    }
  }

  const { errors, isSubmitting } = form.formState;

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <Mail />
          <AlertTitle>{es.auth.forgot.sentTitle}</AlertTitle>
          <AlertDescription>{es.auth.forgot.sentBody}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/ingresar">{es.auth.forgot.back}</Link>
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
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">{es.auth.fields.email}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? es.auth.forgot.submitting : es.auth.forgot.submit}
        </Button>
      </FieldGroup>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/ingresar"
          className="text-foreground font-medium underline underline-offset-4"
        >
          {es.auth.forgot.back}
        </Link>
      </p>
    </form>
  );
}
