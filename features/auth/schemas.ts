import { z } from "zod";

import { es } from "@/messages/es";

/**
 * Validación compartida de los formularios de cuenta (spec §4:
 * react-hook-form + Zod, esquemas compartidos cliente/servidor).
 *
 * Los mensajes salen de `messages/es.ts`: una sola verdad para los textos.
 */

/** Letras, números, puntos y guiones bajos; sin separadores al borde (3 a 30). */
export const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._]{1,28})[a-zA-Z0-9]$/;

const password = z
  .string()
  .min(8, es.auth.errors.passwordShort)
  .max(128, es.auth.errors.passwordLong);

export const signUpSchema = z.object({
  name: z.string().min(2, es.auth.errors.nameShort),
  username: z.string().regex(USERNAME_PATTERN, es.auth.errors.usernameFormat),
  email: z.email(es.auth.errors.emailInvalid),
  password,
  acceptTerms: z
    .boolean()
    .refine((value) => value, { message: es.auth.errors.acceptedTerms }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  identifier: z.string().min(3, es.auth.errors.invalidCredentials),
  password: z.string().min(1, es.auth.errors.invalidCredentials),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email(es.auth.errors.emailInvalid),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password,
    confirm: z.string().min(1, es.auth.errors.passwordMismatch),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: es.auth.errors.passwordMismatch,
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, es.auth.errors.passwordWrong),
    newPassword: password,
    confirm: z.string().min(1, es.auth.errors.passwordMismatch),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ["confirm"],
    message: es.auth.errors.passwordMismatch,
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
