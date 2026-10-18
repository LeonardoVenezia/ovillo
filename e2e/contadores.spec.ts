import { expect, test, type Page } from "@playwright/test";

/**
 * Contador de vueltas, de punta a punta (spec §5.4): varios contadores por
 * proyecto, conteo rápido desde la lista, pantalla completa con recordatorio
 * cada N vueltas, reinicio con confirmación, edición, borrado, privacidad y
 * conteo sin conexión que sincroniza al volver. Usa su propia cuenta para no
 * depender de otros tests.
 */

const NAME = "Prueba Contadores";
const EMAIL = "e2e.contadores@ovillo.test";
const USERNAME = "e2econtadores";
const PASSWORD = "tejido-e2e-1234";
const PROJECT = "Suéter e2e";
const SLUG = "sueter-e2e";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

/** La fila de un contador por su nombre. */
function counterRow(page: Page, name: string) {
  return page.getByTestId("counter-row").filter({ hasText: name });
}

/** Abre el contador "Cuerpo" en pantalla completa desde la lista. */
async function openFullscreen(page: Page) {
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  await counterRow(page, "Cuerpo").getByTestId("counter-row-open").click();
  await expect(page).toHaveURL(/\/contador\/[\w-]+$/);
  await expect(page.getByTestId("counter-fullscreen")).toBeVisible();
}

test("registro rápido de la cuenta de contadores", async ({ page }) => {
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

test("crear: el proyecto suma dos contadores", async ({ page }) => {
  await signIn(page);

  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));

  // "Cuerpo" con recordatorio cada 6 vueltas.
  await page.getByTestId("counter-new-cta").click();
  await page.getByTestId("counter-new-name").fill("Cuerpo");
  await page.getByTestId("counter-new-repeat").fill("6");
  await page.getByTestId("counter-create").click();
  await expect(page.getByText("¡Contador listo!")).toBeVisible();
  await expect(counterRow(page, "Cuerpo")).toContainText(
    "Recordarme cada 6 vueltas",
  );

  // "Manga izq." sin recordatorio.
  await page.getByTestId("counter-new-cta").click();
  await page.getByTestId("counter-new-name").fill("Manga izq.");
  await page.getByTestId("counter-create").click();
  await expect(counterRow(page, "Manga izq.")).toBeVisible();
  await expect(page.getByTestId("counter-row")).toHaveCount(2);
});

test("conteo rápido: suma desde la lista y queda guardado", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);

  const row = counterRow(page, "Cuerpo");
  await row.getByTestId("counter-row-add").click();
  await row.getByTestId("counter-row-add").click();
  await expect(row.getByTestId("counter-row-value")).toHaveText("2");

  // Cuando el guardado termina, el aviso "Guardando…" se va…
  await expect(row.getByText("Guardando…")).toBeVisible();
  await expect(row.getByText("Guardando…")).toBeHidden();

  // …y al recargar sigue en 2 (llegó al servidor).
  await page.reload();
  await expect(
    counterRow(page, "Cuerpo").getByTestId("counter-row-value"),
  ).toHaveText("2");
});

test("pantalla completa: recordatorio cada 6, resta y reinicio", async ({
  page,
}) => {
  await signIn(page);
  await openFullscreen(page);

  const value = page.getByTestId("counter-value");
  await expect(value).toHaveText("2");

  // De 2 a 6: el recordatorio aparece justo en el múltiplo.
  for (let press = 0; press < 4; press += 1) {
    await page.getByTestId("counter-add").click();
  }
  await expect(value).toHaveText("6");
  const reminder = page.getByTestId("counter-reminder");
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText("Momento de aumentar");
  await expect(reminder).toContainText("cada 6");

  // Al restar, el recordatorio se va.
  await page.getByTestId("counter-subtract").click();
  await expect(value).toHaveText("5");
  await expect(reminder).toBeHidden();

  // Reinicio con confirmación.
  await page.getByTestId("counter-reset").click();
  await expect(page.getByText("¿Reiniciar el contador a 0?")).toBeVisible();
  await page.getByTestId("counter-reset-yes").click();
  await expect(value).toHaveText("0");
  // El aviso pasa por "Guardando…" y termina en "Guardado": hay que ver los
  // dos estados para saber que el guardado pasó de verdad.
  const pill = page.getByTestId("counter-sync");
  await expect(pill).toHaveText("Guardando…");
  await expect(pill).toHaveText("Guardado");

  // Al volver al proyecto, la lista muestra el 0 guardado.
  await page.getByRole("link", { name: "Volver al proyecto" }).click();
  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));
  await expect(counterRow(page, "Cuerpo")).toBeVisible();
  await expect(
    counterRow(page, "Cuerpo").getByTestId("counter-row-value"),
  ).toHaveText("0");
});

test("sin conexión: sigue contando y sincroniza al volver", async ({
  page,
}) => {
  await signIn(page);
  await openFullscreen(page);

  const value = page.getByTestId("counter-value");
  await expect(value).toHaveText("0");

  // Se corta la red: el contador sigue andando en el teléfono.
  await page.context().setOffline(true);
  await page.getByTestId("counter-add").click();
  await page.getByTestId("counter-add").click();
  await page.getByTestId("counter-add").click();
  await expect(value).toHaveText("3");
  await expect(page.getByTestId("counter-sync")).toHaveText(
    "Sin conexión: se guarda al volver",
  );

  // Vuelve la conexión: sincroniza solo.
  await page.context().setOffline(false);
  await expect(page.getByTestId("counter-sync")).toHaveText("Guardado");

  // Y quedó en la base.
  await page.reload();
  await expect(page.getByTestId("counter-value")).toHaveText("3");
});

test("editar: cambia el nombre y el recordatorio", async ({ page }) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);

  const row = counterRow(page, "Manga izq.");
  await row.getByRole("button", { name: "Editar contador" }).click();
  await row.getByLabel("Nombre").fill("Manga der.");
  await row.getByLabel("Recordarme cada").fill("8");
  await row.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Contador guardado.")).toBeVisible();
  await expect(counterRow(page, "Manga der.")).toContainText(
    "Recordarme cada 8 vueltas",
  );
});

test("privacidad: el contador no se ve en la página pública", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();

  await visitorPage.goto(`/@${USERNAME}/proyectos/${SLUG}`);
  await expect(
    visitorPage.getByRole("heading", { name: PROJECT }),
  ).toBeVisible();
  await expect(visitorPage.getByTestId("counter-fullscreen")).toHaveCount(0);
  await expect(
    visitorPage.getByRole("heading", { name: "Contador de vueltas" }),
  ).toHaveCount(0);

  await visitor.close();
});

test("borrar: pide confirmación y desaparece", async ({ page }) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);

  const row = counterRow(page, "Manga der.");
  await row.getByRole("button", { name: "Eliminar contador" }).click();
  await expect(row.getByText("¿Eliminar este contador?")).toBeVisible();
  await row.getByRole("button", { name: "Sí, eliminar" }).click();

  await expect(page.getByText("Contador eliminado.")).toBeVisible();
  await expect(page.getByTestId("counter-row")).toHaveCount(1);

  await page.reload();
  await expect(page.getByTestId("counter-row")).toHaveCount(1);
  await expect(counterRow(page, "Cuerpo")).toBeVisible();
});
