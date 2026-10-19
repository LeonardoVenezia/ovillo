import { expect, test, type Page } from "@playwright/test";

/**
 * Hilos y respuestas de punta a punta (spec §5.9, tramo 2): una cuenta crea
 * un grupo y abre una pregunta, sin sesión se invita a ingresar, otra cuenta
 * se suma y responde, la primera marca la solución y la moderación fija y
 * cierra el hilo. Usa sus propias cuentas (A y B) para no depender de otros
 * tests.
 */

const NAME_A = "Prueba Hilos A";
const EMAIL_A = "e2e.hilos@ovillo.test";
const USERNAME_A = "e2ehilos";
const NAME_B = "Prueba Hilos B";
const EMAIL_B = "e2e.hilos2@ovillo.test";
const USERNAME_B = "e2ehilos2";
const PASSWORD = "tejido-e2e-1234";

const GROUP = "Hilos e2e";
const GROUP_SLUG = "hilos-e2e";
const QUESTION = "¿Cómo remato un cuello redondo?";
const QUESTION_BODY = "Probé con una aguja más chica y me queda flojo.";
const REPLY_BODY = "Probá cerrar por el revés con la aguja más chica.";
const ASK_HELP_QUESTION = "¿Cómo bloqueo un gorro al vapor?";
const ASK_HELP_BODY = "Tengo un gorro terminado y no sé si vaporizarlo.";

test.describe.configure({ mode: "serial" });

async function register(
  page: Page,
  name: string,
  username: string,
  email: string,
) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Usuario").fill(username);
  await expect(page.getByText("¡Está libre, es tuyo!")).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/bienvenida$/);
}

async function signIn(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("A crea el grupo y abre una pregunta", async ({ page }) => {
  await register(page, NAME_A, USERNAME_A, EMAIL_A);

  await page.goto("/grupos/nuevo");
  await page.getByTestId("group-name-input").fill(GROUP);
  await page
    .getByTestId("group-description-input")
    .fill("Para probar los hilos de punta a punta.");
  await page.getByTestId("group-submit").click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${GROUP_SLUG}$`));

  // La ficha, sin hilos, invita a abrir el primero.
  await expect(page.getByText("Todavía no hay hilos.")).toBeVisible();
  await page.getByTestId("new-thread").click();
  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/hilos/nuevo$`),
  );

  await page.getByTestId("thread-title-input").fill(QUESTION);
  await page.getByTestId("thread-body-input").fill(QUESTION_BODY);
  await page.getByTestId("thread-submit").click();

  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/hilos/[a-z0-9]+$`),
  );
  await expect(page.getByText("¡Listo, publicamos tu hilo!")).toBeVisible();
  await expect(page.getByRole("heading", { name: QUESTION })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Todavía sin respuestas" }),
  ).toBeVisible();
  await expect(page.getByTestId("reply-form")).toBeVisible();

  // Vuelve a la ficha y aparece en "Hilos recientes", con el enlace al listado.
  await page.goto(`/grupos/${GROUP_SLUG}`);
  await expect(
    page.getByRole("heading", { name: "Hilos recientes" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("thread-card").filter({ hasText: QUESTION }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver todos los hilos" }).click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${GROUP_SLUG}/hilos$`));
  await expect(
    page
      .getByTestId("group-threads")
      .getByTestId("thread-card")
      .filter({ hasText: QUESTION }),
  ).toBeVisible();

  // La pregunta sin responder asoma en la portada de la comunidad.
  await page.goto("/comunidad");
  await expect(page.getByTestId("unanswered-threads")).toContainText(QUESTION);
});

test("sin sesión invita a ingresar; B se suma y responde", async ({ page }) => {
  // Sin sesión se ve el hilo, pero responder pide ingresar.
  await page.goto(`/grupos/${GROUP_SLUG}/hilos`);
  await page.getByTestId("thread-card").filter({ hasText: QUESTION }).click();
  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/hilos/[a-z0-9]+$`),
  );
  const threadUrl = page.url();
  await expect(page.getByTestId("thread-sign-in")).toBeVisible();
  await expect(page.getByTestId("reply-form")).toHaveCount(0);

  // B llega al hilo sin ser parte: se le ofrece unirse.
  await register(page, NAME_B, USERNAME_B, EMAIL_B);
  await page.goto(threadUrl);
  await expect(
    page.getByText("Para escribir acá, unite al grupo."),
  ).toBeVisible();
  await expect(page.getByTestId("reply-form")).toHaveCount(0);

  await page.getByTestId("thread-go-group").click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${GROUP_SLUG}$`));
  await page.getByTestId("group-join-button").click();
  await expect(page.getByText("¡Listo! Ya sos parte del grupo.")).toBeVisible();

  // Ya es parte: responde y queda publicado.
  await page.goto(threadUrl);
  await page.getByTestId("reply-body-input").fill(REPLY_BODY);
  await page.getByTestId("reply-submit").click();
  await expect(page.getByText("¡Publicada!")).toBeVisible();
  await expect(
    page.getByTestId("thread-post").filter({ hasText: REPLY_BODY }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1 respuesta" }),
  ).toBeVisible();
});

test("A marca la solución y la moderación fija y cierra el hilo", async ({
  page,
}) => {
  await signIn(page, EMAIL_A);
  await page.goto(`/grupos/${GROUP_SLUG}/hilos`);
  await page.getByTestId("thread-card").filter({ hasText: QUESTION }).click();

  // Quien abrió la pregunta marca la respuesta de B como solución.
  const reply = page.getByTestId("thread-post").filter({ hasText: REPLY_BODY });
  await reply.getByTestId("solution-button").click();
  await expect(page.getByText("Listo: queda como solución.")).toBeVisible();
  await expect(reply).toContainText("Solución");
  await expect(page.getByText("Resuelta", { exact: true })).toBeVisible();

  // Fija el hilo arriba y lo cierra: sin formulario de respuesta.
  await page.getByTestId("thread-pin-button").click();
  await expect(page.getByText("El hilo quedó fijado arriba.")).toBeVisible();
  await expect(page.getByText("Fijado", { exact: true })).toBeVisible();

  await page.getByTestId("thread-lock-button").click();
  await expect(page.getByText("El hilo quedó cerrado.")).toBeVisible();
  await expect(page.getByTestId("thread-locked-note")).toBeVisible();
  await expect(page.getByTestId("reply-form")).toHaveCount(0);

  // Y lo reabre: el formulario vuelve.
  await page.getByTestId("thread-lock-button").click();
  await expect(page.getByText("El hilo volvió a abrirse.")).toBeVisible();
  await expect(page.getByTestId("reply-form")).toBeVisible();
});

test("desde la comunidad se pregunta eligiendo grupo", async ({ page }) => {
  // Sin sesión, «Pedir ayuda» manda a ingresar y vuelve acá.
  await page.goto("/comunidad/preguntar");
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fcomunidad%2Fpreguntar$/);

  await signIn(page, EMAIL_B);
  await page.goto("/comunidad/preguntar");
  await expect(
    page.getByRole("heading", { name: "Pedir ayuda en la comunidad" }),
  ).toBeVisible();

  // B solo integra un grupo: ya viene elegido, y el tipo es Pregunta.
  await page.getByTestId("thread-title-input").fill(ASK_HELP_QUESTION);
  await page.getByTestId("thread-body-input").fill(ASK_HELP_BODY);
  await page.getByTestId("thread-submit").click();

  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/hilos/[a-z0-9]+$`),
  );
  await expect(
    page.getByRole("heading", { name: ASK_HELP_QUESTION }),
  ).toBeVisible();
  await expect(page.getByText("Pregunta", { exact: true })).toBeVisible();
});

test("el hilo que no existe da 404", async ({ page }) => {
  const response = await page.goto(`/grupos/${GROUP_SLUG}/hilos/no-existe-e2e`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});
