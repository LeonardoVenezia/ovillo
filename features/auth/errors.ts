import { es } from "@/messages/es";

/**
 * Traduce los errores de Better Auth a mensajes en español para la UI.
 *
 * La mayoría de los errores traen `code`; si no, se usa el status HTTP.
 * Nunca mostramos el mensaje crudo en inglés del servidor.
 */
export function mapAuthError(error: unknown): string {
  const { code, message, status } = (error ?? {}) as {
    code?: string;
    message?: string;
    status?: number;
  };

  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USERNAME_OR_PASSWORD":
    case "INVALID_CREDENTIALS":
      return es.auth.errors.invalidCredentials;
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return es.auth.errors.emailTaken;
    case "USERNAME_IS_ALREADY_TAKEN":
      return es.auth.errors.usernameTaken;
    case "USERNAME_TOO_SHORT":
    case "USERNAME_TOO_LONG":
    case "INVALID_USERNAME":
      return es.auth.errors.usernameFormat;
    case "INVALID_EMAIL":
      return es.auth.errors.emailInvalid;
    case "PASSWORD_TOO_SHORT":
      return es.auth.errors.passwordShort;
    case "PASSWORD_TOO_LONG":
      return es.auth.errors.passwordLong;
    case "INVALID_PASSWORD":
      return es.auth.errors.passwordWrong;
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return es.auth.errors.invalidToken;
  }

  if (status === 429) {
    return es.auth.errors.rateLimited;
  }
  if (status === 401) {
    return es.auth.errors.invalidCredentials;
  }
  if (typeof status === "number" && status >= 500) {
    return es.auth.errors.generic;
  }
  if (typeof message === "string" && /fetch|network/i.test(message)) {
    return es.auth.errors.network;
  }
  return es.auth.errors.generic;
}
