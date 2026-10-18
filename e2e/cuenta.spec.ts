import { expect, test, type Page } from "@playwright/test";

import { waitForEmailLink } from "./helpers/outbox";

/**
 * Flujos de cuenta de punta a punta (spec §5.1): registro, verificación por
 * email, bienvenida, perfil con privacidad, cerrar sesión y recuperar la
 * contraseña. El ingreso con Google queda pendiente (lo pidió el dueño para
 * el final).
 *
 * Los pasos comparten una sola cuenta, así que van en serie.
 */

const NAME = "Prueba E2E";
const EMAIL = "e2e.cuenta@ovillo.test";
const USERNAME = "e2ecuenta";
const PASSWORD = "tejido-e2e-1234";
const NEW_PASSWORD = "tejido-e2e-5678";
const BIO = "Tejo medias y bufandas para regalar.";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(identifier);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("registro: crea la cuenta y aterriza en la bienvenida", async ({
  page,
}) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(NAME);
  await page.getByLabel("Usuario").fill(USERNAME);
  await expect(page.getByText("¡Está libre, es tuyo!")).toBeVisible();

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();

  await expect(page).toHaveURL(/\/bienvenida$/);
});

test("email: el enlace de verificación confirma la cuenta", async ({
  page,
}) => {
  const link = await waitForEmailLink({
    to: EMAIL,
    includes: "/verify-email?",
  });
  await page.goto(link);

  await expect(page).toHaveURL(/\/mi-tejido\?verificado=1$/);
  await expect(page.getByText("¡Email confirmado!")).toBeVisible();
});

test("bienvenida: guarda técnicas, nivel y país", async ({ page }) => {
  await signIn(page, EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/mi-tejido$/);

  await page.goto("/bienvenida");
  await page.getByRole("button", { name: "Dos agujas" }).click();
  await page.getByRole("button", { name: "Intermedia" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("País").selectOption("AR");
  await page.getByLabel(/Ciudad o región/).fill("Rosario, Santa Fe");
  await page.getByRole("button", { name: "Terminar" }).click();

  await expect(page).toHaveURL(/\/mi-tejido$/);
  await expect(
    page.getByText("¡Listo! Con esto Ovillo te conoce un poco más."),
  ).toBeVisible();
  await expect(page.getByText("Terminá de armar tu perfil")).toHaveCount(0);
});

test("perfil: guarda bio y enlaces, y respeta el modo privado", async ({
  page,
  browser,
}) => {
  // Entrar con @usuario también queda cubierto.
  await signIn(page, `@${USERNAME}`, PASSWORD);
  await expect(page).toHaveURL(/\/mi-tejido$/);

  await page.goto("/configuracion");
  await page.getByLabel("Sobre vos").fill(BIO);
  await page.getByLabel("Instagram").fill("@ovilloe2e");
  await page.getByLabel("TikTok").fill("@ovilloe2e");
  await page.getByRole("radio", { name: /Solo para mí/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("¡Perfil guardado!")).toBeVisible();

  // La dueña se ve completa, con la insignia de privacidad.
  await page.goto(`/@${USERNAME}`);
  await expect(page.getByText("Solo para mí", { exact: true })).toBeVisible();
  await expect(page.getByText(BIO)).toBeVisible();

  // Quien visita solo ve nombre y @usuario.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/@${USERNAME}`);
  await expect(
    visitorPage.getByText(
      "La persona eligió que su página no sea pública por ahora.",
    ),
  ).toBeVisible();
  await expect(visitorPage.getByText(BIO)).toHaveCount(0);

  // Vuelve a ser pública: bio, técnicas y enlaces a la vista.
  await page.goto("/configuracion");
  await page.getByRole("radio", { name: /^Perfil público/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("¡Perfil guardado!")).toBeVisible();

  await visitorPage.reload();
  await expect(visitorPage.getByText(BIO)).toBeVisible();
  await expect(visitorPage.getByText("Dos agujas")).toBeVisible();
  await expect(visitorPage.getByText("Intermedia")).toBeVisible();
  await expect(
    visitorPage.getByRole("link", { name: "Instagram" }),
  ).toHaveAttribute("href", "https://instagram.com/ovilloe2e");
  await expect(
    visitorPage.getByRole("link", { name: "TikTok" }),
  ).toHaveAttribute("href", "https://tiktok.com/@ovilloe2e");

  await visitor.close();
});

test("sesión: cerrar sesión vuelve a la portada", async ({ page }) => {
  await signIn(page, EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/mi-tejido$/);

  // Con sesión, la portada lleva al cuaderno en vez de pedir ingresar.
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Ir a Mi tejido" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear mi cuenta" })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Tu cuenta" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Crear mi cuenta" }),
  ).toBeVisible();
});

test("contraseña: recuperación completa desde el email", async ({ page }) => {
  await page.goto("/recuperar");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Enviar el enlace" }).click();
  await expect(page.getByText("Revisá tu email")).toBeVisible();

  // El endpoint de Better Auth redirige a /restablecer?token=…
  const link = await waitForEmailLink({
    to: EMAIL,
    includes: "/reset-password/",
  });
  await page.goto(link);

  await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
  await page.getByLabel("Repetí la contraseña").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(
    page.getByText("¡Listo! Ya tenés contraseña nueva"),
  ).toBeVisible();

  // La vieja ya no sirve…
  await signIn(page, EMAIL, PASSWORD);
  await expect(
    page.getByText("El email o la contraseña no coinciden."),
  ).toBeVisible();

  // …y la nueva sí.
  await signIn(page, EMAIL, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/mi-tejido$/);
});
