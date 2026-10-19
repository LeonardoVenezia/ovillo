import { expect, test, type Page } from "@playwright/test";

/**
 * "Quiero tejer" de punta a punta (spec §5.8): sumar desde la ficha, el hub
 * que cuenta, el orden con flechas, la lana planeada con fecha y notas, el
 * botón "Empezar" con el formulario prellenado y quitar de la cola. Usa su
 * propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Quiero Tejer";
const EMAIL = "e2e.quierotejer@ovillo.test";
const USERNAME = "e2equierotejer";
const PASSWORD = "tejido-e2e-1234";

const PATTERN_ONE = "Malu Hat";
const PATTERN_ONE_SLUG = "malu-hat";
const PATTERN_TWO = "Bufanda fácil en Fil Piuma";
const PATTERN_TWO_SLUG = "bufanda-facil-en-fil-piuma";
const STASH_NAME = "Lana para la cola";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("registro rápido de la cuenta de Quiero tejer", async ({ page }) => {
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

test("la ficha suma a la cola y el hub la cuenta", async ({ page }) => {
  await signIn(page);

  await page.goto(`/patrones/${PATTERN_ONE_SLUG}`);
  await page.getByTestId("queue-toggle").click();
  await expect(page.getByTestId("queue-toggle")).toHaveText("En la cola");
  await expect(page.getByText("¡Sumado a Quiero tejer!")).toBeVisible();

  await page.goto("/mi-tejido");
  await expect(page.getByText("Tenés 1 patrón en la cola.")).toBeVisible();
  await page.getByRole("link", { name: "Ver mi cola" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/quiero-tejer$/);

  const row = page.getByTestId("queue-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(PATTERN_ONE);
  await expect(row.getByTestId("queue-planned-yarn")).toHaveText(
    "Sin lana planeada",
  );
});

test("orden: las flechas mueven la cola", async ({ page }) => {
  await signIn(page);

  await page.goto(`/patrones/${PATTERN_TWO_SLUG}`);
  await page.getByTestId("queue-toggle").click();
  await expect(page.getByTestId("queue-toggle")).toHaveText("En la cola");

  await page.goto("/mi-tejido/quiero-tejer");
  const rows = page.getByTestId("queue-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(PATTERN_ONE);
  await expect(rows.nth(1)).toContainText(PATTERN_TWO);

  // Subir la segunda: queda primera.
  await rows.nth(1).getByTestId("queue-move-up").click();
  await expect(rows.nth(0)).toContainText(PATTERN_TWO);

  // Bajar: vuelve al final y la primera no se puede subir más.
  await rows.nth(0).getByTestId("queue-move-down").click();
  await expect(rows.nth(0)).toContainText(PATTERN_ONE);
  await expect(rows.nth(0).getByTestId("queue-move-up")).toBeDisabled();
  await expect(rows.nth(1).getByTestId("queue-move-down")).toBeDisabled();
});

test("detalles: lana planeada, fecha objetivo y notas", async ({ page }) => {
  await signIn(page);

  // Una lana en el inventario para poder planear con ella.
  await page.goto("/mi-tejido/lanas");
  await page.getByTestId("stash-new-cta").click();
  await page.getByTestId("stash-source-free").click();
  await page.getByTestId("stash-custom-name").fill(STASH_NAME);
  await page.getByTestId("stash-weight-dk").click();
  await page.getByTestId("stash-color-rojo").click();
  await page.getByTestId("stash-skeins").fill("2");
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();

  await page.goto("/mi-tejido/quiero-tejer");
  const row = page.getByTestId("queue-row").filter({ hasText: PATTERN_ONE });
  await row.getByTestId("queue-edit").click();
  await row
    .getByTestId("queue-planned-select")
    .selectOption({ label: `${STASH_NAME} · Disponible: 2 de 2 ovillos` });
  await row.getByTestId("queue-target-date-input").fill("2026-12-01");
  await row
    .getByTestId("queue-notes-input")
    .fill("Para el cumple de mi hermana.");
  await row.getByTestId("queue-save-details").click();
  await expect(page.getByText("Detalles guardados.")).toBeVisible();

  const updated = page
    .getByTestId("queue-row")
    .filter({ hasText: PATTERN_ONE });
  await expect(updated.getByTestId("queue-planned-yarn")).toContainText(
    STASH_NAME,
  );
  await expect(updated.getByTestId("queue-target-date")).toContainText(
    "Para el 01/12/2026",
  );
  await expect(updated.getByTestId("queue-notes")).toContainText(
    "Para el cumple de mi hermana.",
  );
});

test("empezar: abre el formulario con el patrón elegido", async ({ page }) => {
  await signIn(page);

  await page.goto("/mi-tejido/quiero-tejer");
  const row = page.getByTestId("queue-row").filter({ hasText: PATTERN_TWO });
  await row.getByTestId("queue-start").click();
  await expect(page).toHaveURL(
    new RegExp(`/mi-tejido/proyectos/nuevo\\?patron=${PATTERN_TWO_SLUG}$`),
  );
  await expect(page.locator("#patternId option:checked")).toContainText(
    PATTERN_TWO,
  );
});

test("quitar: sale de la cola y la ficha vuelve a ofrecerla", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/mi-tejido/quiero-tejer");
  const row = page.getByTestId("queue-row").filter({ hasText: PATTERN_TWO });
  await row.getByTestId("queue-remove").click();
  await expect(page.getByText("Quitado de la cola.")).toBeVisible();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);

  await page.goto(`/patrones/${PATTERN_TWO_SLUG}`);
  await expect(page.getByTestId("queue-toggle")).toHaveText("Quiero tejer");
});
