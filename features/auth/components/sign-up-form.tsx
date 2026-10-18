"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { hardNavigate } from "@/lib/navigation";
import { es } from "@/messages/es";

import { mapAuthError } from "../errors";
import { USERNAME_PATTERN, signUpSchema, type SignUpValues } from "../schemas";

type UsernameStatus = "idle" | "checking" | "available" | "taken";

/** Resultado de una consulta de disponibilidad (clave: el @usuario). */
type UsernameAvailability = { username: string; available: boolean | null };

function deriveUsernameStatus(
  candidate: string,
  isValid: boolean,
  availability: UsernameAvailability | null,
): UsernameStatus {
  if (!isValid) {
    return "idle";
  }
  if (!availability || availability.username !== candidate) {
    return "checking";
  }
  if (availability.available === null) {
    return "idle";
  }
  return availability.available ? "available" : "taken";
}

export function SignUpForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<UsernameAvailability | null>(
    null,
  );

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
  });

  const usernameValue = useWatch({ control: form.control, name: "username" });
  const candidate = usernameValue.trim().toLowerCase();
  const isCandidateValid = USERNAME_PATTERN.test(candidate);

  // La última consulta vive en un ref para poder descartar respuestas viejas.
  const candidateRef = useRef(candidate);
  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  // Disponibilidad del @usuario: consultamos con una pequeña espera para no
  // disparar una consulta por letra (spec §5.1).
  useEffect(() => {
    if (!isCandidateValid) {
      return;
    }

    const timer = setTimeout(async () => {
      const { data, error } = await authClient.isUsernameAvailable({
        username: candidate,
      });
      if (candidateRef.current !== candidate) {
        return; // La persona siguió escribiendo: descartamos esta respuesta.
      }
      setAvailability({
        username: candidate,
        available: error ? null : data?.available === true,
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [candidate, isCandidateValid]);

  const usernameStatus = deriveUsernameStatus(
    candidate,
    isCandidateValid,
    availability,
  );

  async function onSubmit(values: SignUpValues) {
    setFormError(null);
    try {
      const { error } = await authClient.signUp.email({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        username: values.username.trim().toLowerCase(),
        callbackURL: "/mi-tejido?verificado=1",
      });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      toast.success(es.auth.signUp.welcomeToast);
      // Recarga completa: la sesión acaba de nacer y no hay que reusar nada
      // prefetcheado de antes del registro (ver `lib/navigation.ts`).
      hardNavigate("/bienvenida");
    } catch (caught) {
      setFormError(mapAuthError(caught));
    }
  }

  const usernameDescription =
    usernameStatus === "available"
      ? es.auth.signUp.usernameAvailable
      : usernameStatus === "taken"
        ? es.auth.signUp.usernameTaken
        : usernameStatus === "checking"
          ? es.auth.signUp.usernameChecking
          : es.auth.hints.username;

  const { errors, isSubmitting } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name">{es.auth.fields.name}</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="username">{es.auth.fields.username}</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            placeholder="tejedora"
            aria-invalid={Boolean(errors.username)}
            {...form.register("username")}
          />
          <FieldDescription
            aria-live="polite"
            className={
              usernameStatus === "available"
                ? "text-sage"
                : usernameStatus === "taken"
                  ? "text-destructive"
                  : undefined
            }
          >
            {usernameDescription}
          </FieldDescription>
          <FieldError errors={[errors.username]} />
        </Field>

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

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">{es.auth.fields.password}</FieldLabel>
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

        <Field
          orientation="horizontal"
          data-invalid={errors.acceptTerms ? true : undefined}
        >
          <Controller
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <FieldLabel htmlFor="acceptTerms" className="font-normal">
            {es.auth.signUp.termsPrefix}{" "}
            <Link href="/normas">{es.auth.signUp.termsLink}</Link>{" "}
            {es.auth.signUp.termsSuffix}
          </FieldLabel>
        </Field>
        <FieldError errors={[errors.acceptTerms]} />

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? es.auth.signUp.submitting : es.auth.signUp.submit}
        </Button>
      </FieldGroup>

      <p className="text-muted-foreground text-center text-sm">
        {es.auth.signUp.haveAccount}{" "}
        <Link
          href="/ingresar"
          className="text-foreground font-medium underline underline-offset-4"
        >
          {es.auth.signUp.haveAccountCta}
        </Link>
      </p>
    </form>
  );
}
