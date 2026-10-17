"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { safeInternalPath } from "@/lib/safe-redirect";
import { es } from "@/messages/es";

import { mapAuthError } from "../errors";
import { signInSchema, type SignInValues } from "../schemas";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volver = safeInternalPath(searchParams.get("volver")) ?? "/mi-tejido";
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    const raw = values.identifier.trim();
    const bare = raw.startsWith("@") ? raw.slice(1) : raw;

    try {
      // Acepta email o @usuario en el mismo campo (plugin `username`).
      const { error } = bare.includes("@")
        ? await authClient.signIn.email({
            email: bare,
            password: values.password,
          })
        : await authClient.signIn.username({
            username: bare.toLowerCase(),
            password: values.password,
          });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      toast.success(es.auth.signIn.welcomeToast);
      router.push(volver);
      router.refresh();
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
        <Field data-invalid={errors.identifier ? true : undefined}>
          <FieldLabel htmlFor="identifier">
            {es.auth.fields.emailOrUsername}
          </FieldLabel>
          <Input
            id="identifier"
            autoComplete="username"
            aria-invalid={Boolean(errors.identifier)}
            {...form.register("identifier")}
          />
          <FieldError errors={[errors.identifier]} />
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">{es.auth.fields.password}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
          <FieldDescription className="text-right">
            <Link href="/recuperar">{es.auth.signIn.forgot}</Link>
          </FieldDescription>
        </Field>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? es.auth.signIn.submitting : es.auth.signIn.submit}
        </Button>
      </FieldGroup>

      <p className="text-muted-foreground text-center text-sm">
        {es.auth.signIn.noAccount}{" "}
        <Link
          href="/registro"
          className="text-foreground font-medium underline underline-offset-4"
        >
          {es.auth.signIn.noAccountCta}
        </Link>
      </p>
    </form>
  );
}
