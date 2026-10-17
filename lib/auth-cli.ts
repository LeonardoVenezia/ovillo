/**
 * Entrada para el CLI de Better Auth (`pnpm dlx auth@latest generate`).
 *
 * El CLI necesita un módulo que exporte la instancia ya creada; en el código
 * de la app usamos `getAuth()` lazy para no exigir secretos en build/CI.
 * Este archivo solo lo importa el CLI (correrlo con `.env.local` cargado).
 */
import { getAuth } from "./auth";

export const auth = getAuth();
export default auth;
