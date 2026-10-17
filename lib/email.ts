import { Resend } from "resend";

import { getEnv } from "./env";
import { SITE_NAME, SITE_URL } from "./site";

/**
 * Emails transaccionales (spec §4: Resend + plantillas propias en español).
 *
 * Sin `RESEND_API_KEY` (desarrollo) el envío se registra en consola para poder
 * probar los flujos igual. En producción la clave vive en `.env.local` y en
 * Vercel. Las plantillas se arman con funciones puras para poder testearlas.
 */

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({
  title,
  intro,
  ctaLabel,
  ctaUrl,
  note,
}: {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  note: string;
}): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background-color:#faf7f2;">
    <div style="max-width:520px;margin:0 auto;background-color:#ffffff;border:1px solid #e6dfd5;border-radius:16px;padding:32px 28px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#2a2622;">${SITE_NAME}</p>
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#2a2622;">${title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#2a2622;">${intro}</p>
      <p style="margin:0 0 24px;">
        <a href="${safeUrl}" style="display:inline-block;background-color:#b5532e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">${ctaLabel}</a>
      </p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6e665d;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
        <a href="${safeUrl}" style="color:#b5532e;">${safeUrl}</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6e665d;">${note}</p>
    </div>
    <p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.6;color:#6e665d;text-align:center;">
      ${SITE_NAME} — la comunidad de tejido en español.<br />${SITE_URL}
    </p>
  </body>
</html>`;
}

export function buildVerificationEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}): EmailContent {
  const safeName = escapeHtml(name);
  const title = "Confirmá tu email";
  const note =
    "El enlace vence en una hora. Si no creaste una cuenta, podés ignorar este mensaje.";
  return {
    subject: `Confirmá tu email para empezar en ${SITE_NAME}`,
    html: layout({
      title,
      intro: `¡Hola, ${safeName}! Ya casi estás: confirmá tu dirección de email para terminar de crear tu cuenta.`,
      ctaLabel: "Confirmar mi email",
      ctaUrl: url,
      note,
    }),
    text: `¡Hola, ${name}!\n\nConfirmá tu dirección de email para terminar de crear tu cuenta en ${SITE_NAME}:\n${url}\n\n${note}`,
  };
}

export function buildPasswordResetEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}): EmailContent {
  const safeName = escapeHtml(name);
  const title = "Elegí una nueva contraseña";
  const note =
    "Si no lo pediste, ignorá este mensaje: tu contraseña sigue igual. El enlace vence en una hora.";
  return {
    subject: `Elegí una nueva contraseña en ${SITE_NAME}`,
    html: layout({
      title,
      intro: `¡Hola, ${safeName}! Pediste restablecer tu contraseña. Podés elegir una nueva acá:`,
      ctaLabel: "Crear contraseña nueva",
      ctaUrl: url,
      note,
    }),
    text: `¡Hola, ${name}!\n\nPediste restablecer tu contraseña en ${SITE_NAME}. Elegí una nueva acá:\n${url}\n\n${note}`,
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: { to: string } & EmailContent): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getEnv().EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY sin configurar: no se envió «${subject}» a ${to}.`,
    );
    console.info(`[email] contenido (modo desarrollo):\n${text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error(
      `[email] Resend rechazó «${subject}» para ${to}: ${error.message}`,
    );
  }
}

export async function sendVerificationEmail({
  to,
  name,
  url,
}: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  await sendEmail({ to, ...buildVerificationEmail({ name, url }) });
}

export async function sendPasswordResetEmail({
  to,
  name,
  url,
}: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  await sendEmail({ to, ...buildPasswordResetEmail({ name, url }) });
}
