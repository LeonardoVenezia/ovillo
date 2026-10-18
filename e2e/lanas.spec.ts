import { expect, test, type Page } from "@playwright/test";

import { waitForEmailLink } from "./helpers/outbox";

/**
 * Catálogo de lanas (spec §5.6, tramo 1 de la Fase 4): lista pública con
 * búsqueda y filtros, ficha, propuesta con email confirmado, aviso de "sin
 * revisar", detección de duplicados y edición de la propia.
 *
 * Usa su propia cuenta para no depender de otros tests. Los conteos (38
 * lanas) son de la siembra base (`pnpm db:seed-yarns`): si la siembra crece,
 * estos números se actualizan.
 */

const NAME = "Prueba Lanas";
const EMAIL = "e2e.lanas@ovillo.test";
const USERNAME = "e2elanas";
const PASSWORD = "tejido-e2e-1234";
const YARN_NAME = "Prueba Ovillo";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("registro: crea la cuenta y la propuesta avisa que falta confirmar el email", async ({
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

  // Con la sesión abierta pero sin confirmar: la página de proponer avisa.
  await page.goto("/explorar/lanas/proponer");
  await expect(page.getByTestId("yarn-verified-notice")).toBeVisible();
  await expect(page.getByTestId("yarn-form")).toHaveCount(0);
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

test("catálogo público: hub, lista, búsqueda sin acentos y filtros", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/explorar");
  await page.getByTestId("explore-lanas-card").click();
  await expect(page).toHaveURL(/\/explorar\/lanas$/);
  await expect(page.getByTestId("yarns-count")).toHaveText("38 lanas");
  await expect(page.getByTestId("yarn-card").first()).toBeVisible();

  // "sinfonia" encuentra "Sinfonía" y "Sinfonía Plus" (sin acento, con él).
  await page.getByTestId("yarn-search").fill("sinfonia");
  await expect(page.getByTestId("yarns-count")).toHaveText("2 lanas");
  await expect(
    page.getByTestId("yarn-card").filter({ hasText: "Sinfonía" }).first(),
  ).toBeVisible();

  // País de la marca: España trae Katia y Lanas Stop.
  await page.getByTestId("yarn-search").fill("");
  await page.getByTestId("yarn-filter-pais").selectOption("ES");
  await expect(page.getByTestId("yarns-count")).toHaveText("12 lanas");
  await expect(
    page.getByTestId("yarn-card").filter({ hasText: "Olaf" }),
  ).toBeVisible();

  // Marca + grosor se combinan en la URL.
  await page.getByTestId("yarn-filter-marca").selectOption("katia");
  await expect(page.getByTestId("yarns-count")).toHaveText("11 lanas");
  await expect(
    page.getByTestId("yarn-card").filter({ hasText: "Olaf" }),
  ).toHaveCount(0);
  await page.getByTestId("yarn-filter-grosor-bulky").click();
  await expect(page.getByTestId("yarns-count")).toHaveText("1 lana");
  await expect(
    page.getByTestId("yarn-card").filter({ hasText: "Azteca Felting Wool" }),
  ).toBeVisible();

  // Limpiar deja todo de nuevo.
  await page.getByTestId("yarn-clear-filters").click();
  await expect(page.getByTestId("yarns-count")).toHaveText("38 lanas");

  await visitor.close();
});

test("ficha: composición, ovillo y agujas; y el 404 real de una lana que no existe", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/lanas/hilados-lho/fidelio");
  await expect(page.getByRole("heading", { name: "Fidelio" })).toBeVisible();
  const detail = page.getByTestId("yarn-detail");
  await expect(detail).toContainText("100% acrílico");
  await expect(detail).toContainText("100 g · 150 m");
  await expect(detail).toContainText("4,5–5 mm");
  await expect(detail).toContainText("Argentina");
  await expect(page.getByText("Mediana gruesa (aran)")).toBeVisible();
  // Lana de la siembra: no tiene aviso de "sin revisar".
  await expect(page.getByTestId("yarn-unreviewed-notice")).toHaveCount(0);

  await page.goto("/lanas/hilados-lho/no-existe");
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();

  await visitor.close();
});

test("proponer: marca existente, datos completos y aviso de sin revisar", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/explorar/lanas/proponer");

  await page.locator("#brand").selectOption({ label: "Hilados LHO" });
  await page.locator("#name").fill(YARN_NAME);
  await page.locator("#weight").selectOption("worsted");
  await page.locator("#fiber-0").selectOption("algodon");
  await page.locator("#grams").fill("100");
  await page.locator("#meters").fill("120");
  await page.locator("#needle-min").fill("6");
  await page.locator("#needle-max").fill("7");
  await page.getByTestId("yarn-form-submit").click();

  await expect(page).toHaveURL(/\/lanas\/hilados-lho\/prueba-ovillo$/);
  await expect(page.getByRole("heading", { name: YARN_NAME })).toBeVisible();
  await expect(page.getByTestId("yarn-unreviewed-notice")).toBeVisible();
  await expect(
    page.locator('[data-slot="badge"]').filter({ hasText: "Sin revisar" }),
  ).toBeVisible();
  const detail = page.getByTestId("yarn-detail");
  await expect(detail).toContainText("100% algodón");
  await expect(detail).toContainText("100 g · 120 m");
  await expect(detail).toContainText("6–7 mm");
  await expect(detail.getByText("La propuso")).toBeVisible();
  // Quien la propuso puede editarla.
  await expect(page.getByTestId("yarn-edit-link")).toBeVisible();
});

test("duplicado: avisa en vivo y enlaza a la que ya existe", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/explorar/lanas/proponer");

  await page.locator("#brand").selectOption({ label: "Hilados LHO" });
  await page.locator("#name").fill("fidelio"); // minúsculas: igual cuenta
  const duplicate = page.getByTestId("yarn-duplicate");
  await expect(duplicate).toBeVisible();
  await expect(duplicate).toContainText(
    "En Hilados LHO ya hay una lana «Fidelio»",
  );
  await expect(
    duplicate.getByRole("link", { name: "Ver la que existe" }),
  ).toHaveAttribute("href", "/lanas/hilados-lho/fidelio");
  await expect(page.getByTestId("yarn-form-submit")).toBeDisabled();
});

test("editar: corrige datos, mantiene el slug y sigue sin revisar", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/lanas/hilados-lho/prueba-ovillo");
  await page.getByTestId("yarn-edit-link").click();
  await expect(page).toHaveURL(/\/lanas\/hilados-lho\/prueba-ovillo\/editar$/);

  // Ponerse el nombre de otra lana de la marca está bloqueado (la propia no:
  // el formulario se excluye a sí mismo del chequeo).
  await page.locator("#name").fill("Fidelio");
  await expect(page.getByTestId("yarn-duplicate")).toBeVisible();
  await expect(page.getByTestId("yarn-form-submit")).toBeDisabled();

  await page.locator("#name").fill(YARN_NAME);
  await expect(page.getByTestId("yarn-duplicate")).toHaveCount(0);
  await page.locator("#weight").selectOption("bulky");
  await page.locator("#grams").fill("110");
  await page.getByTestId("yarn-form-submit").click();

  await expect(page).toHaveURL(/\/lanas\/hilados-lho\/prueba-ovillo$/);
  await expect(
    page.locator('[data-slot="badge"]').filter({ hasText: "Gruesa (bulky)" }),
  ).toBeVisible();
  await expect(page.getByTestId("yarn-detail")).toContainText("110 g · 120 m");
  await expect(page.getByTestId("yarn-unreviewed-notice")).toBeVisible();
});

test("la propuesta se ve al instante para el público", async ({ browser }) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/lanas/hilados-lho/prueba-ovillo");
  await expect(page.getByRole("heading", { name: YARN_NAME })).toBeVisible();
  await expect(page.getByTestId("yarn-unreviewed-notice")).toBeVisible();

  await page.goto("/explorar/lanas");
  await page.getByTestId("yarn-search").fill("prueba ovillo");
  await expect(page.getByTestId("yarns-count")).toHaveText("1 lana");
  await expect(
    page.getByTestId("yarn-card").filter({ hasText: YARN_NAME }),
  ).toBeVisible();

  await visitor.close();
});
