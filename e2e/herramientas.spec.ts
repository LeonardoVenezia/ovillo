import { expect, test, type Page } from "@playwright/test";

/**
 * Herramientas del inventario (spec §5.7): alta de agujas y ganchos con su
 * equivalencia US/UK, filtro por tipo, edición, borrado, resumen en el hub y
 * privacidad. Usa su propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Herramientas";
const EMAIL = "e2e.herramientas@ovillo.test";
const USERNAME = "e2eherramientas";
const PASSWORD = "tejido-e2e-1234";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

/** La tarjeta de una herramienta por su medida ("4", "3,5", "80"…). */
function toolRow(page: Page, sizeMm: string) {
  return page.locator(`[data-testid="tool-row"][data-size="${sizeMm}"]`);
}

test("registro rápido de la cuenta de herramientas", async ({ page }) => {
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

test("vacío: el hub invita y la página muestra el estado vacío", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByText("Todavía no cargaste agujas ni ganchos."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ver mis herramientas" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/herramientas$/);
  await expect(
    page.getByRole("heading", { name: "Herramientas" }),
  ).toBeVisible();
  await expect(page.getByText("Todavía no hay herramientas")).toBeVisible();
  await expect(page.getByTestId("equivalence-table")).toBeVisible();
});

test("alta: guarda la medida con su equivalencia", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  await page.getByTestId("tool-new-cta").click();
  await page.getByTestId("tool-size").fill("4");
  await expect(page.getByTestId("tool-size-equivalence")).toHaveText(
    "US 6 · UK 8",
  );
  await page.getByTestId("tool-material-aluminio").click();
  await page.getByTestId("tool-quantity").fill("2");
  await page
    .getByTestId("tool-notes")
    .fill("Las de mi abuela, heredadas.");
  await page.getByTestId("tool-save").click();
  await expect(page.getByText("¡Herramienta guardada!")).toBeVisible();

  const row = toolRow(page, "4");
  await expect(row).toBeVisible();
  await expect(row.getByTestId("tool-row-size")).toHaveText("4 mm");
  await expect(row.getByTestId("tool-row-equivalence")).toHaveText(
    "US 6 · UK 8",
  );
  await expect(row).toContainText("Agujas rectas · Aluminio");
  await expect(row.getByTestId("tool-row-quantity")).toContainText("×2");
  await expect(row.getByTestId("tool-row-notes")).toHaveText(
    "Las de mi abuela, heredadas.",
  );
});

test("alta: gancho con letra y circular con largo de cable", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  await page.getByTestId("tool-new-cta").click();
  await page.getByTestId("tool-kind-gancho").click();
  await page.getByTestId("tool-size").fill("3,5");
  await expect(page.getByTestId("tool-size-equivalence")).toHaveText("US E-4");
  // Sin cable en un gancho: el campo ni aparece.
  await expect(page.getByTestId("tool-cable")).toHaveCount(0);
  await page.getByTestId("tool-save").click();
  await expect(toolRow(page, "3,5")).toBeVisible();

  await page.getByTestId("tool-new-cta").click();
  await page.getByTestId("tool-kind-circulares").click();
  await page.getByTestId("tool-size").fill("5");
  await page.getByTestId("tool-cable").fill("80");
  await page.getByTestId("tool-material-madera").click();
  await page.getByTestId("tool-save").click();

  const circular = toolRow(page, "5");
  await expect(circular).toBeVisible();
  await expect(circular.getByTestId("tool-row-equivalence")).toHaveText(
    "US 8 · UK 6",
  );
  await expect(circular).toContainText("Agujas circulares · Madera · cable 80 cm");

  // Quedaron la recta, el gancho y la circular.
  await expect(page.getByTestId("tool-row")).toHaveCount(3);
});

test("filtros: muestra solo el tipo elegido", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  await page.getByTestId("tool-filter-gancho").click();
  await expect(page.getByTestId("tool-row")).toHaveCount(1);
  await expect(toolRow(page, "3,5")).toBeVisible();

  await page.getByTestId("tool-filter-doble-punta").click();
  await expect(page.getByTestId("tool-filter-empty")).toBeVisible();
  await expect(page.getByTestId("tool-row")).toHaveCount(0);

  await page.getByTestId("tool-filter-todas").click();
  await expect(page.getByTestId("tool-row")).toHaveCount(3);
});

test("editar: corrige la medida y con ella la equivalencia", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  const row = toolRow(page, "4");
  await row.getByTestId("tool-edit").click();
  const form = row.getByTestId("tool-edit-form");
  await form.getByTestId("tool-size").fill("4,5");
  await expect(form.getByTestId("tool-size-equivalence")).toHaveText(
    "US 7 · UK 7",
  );
  await form.getByTestId("tool-quantity").fill("1");
  await form.getByTestId("tool-save").click();
  await expect(page.getByText("Herramienta actualizada.")).toBeVisible();

  const updated = toolRow(page, "4,5");
  await expect(updated).toBeVisible();
  await expect(updated.getByTestId("tool-row-equivalence")).toHaveText(
    "US 7 · UK 7",
  );
  // Con una sola unidad, la chapita de cantidad desaparece.
  await expect(updated.getByTestId("tool-row-quantity")).toHaveCount(0);
});

test("borrar: pide confirmación y desaparece", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  const row = toolRow(page, "5");
  await row.getByTestId("tool-delete").click();
  await expect(row.getByText("¿Eliminar esta herramienta?")).toBeVisible();
  await row.getByTestId("tool-delete-confirm").click();
  await expect(page.getByText("Herramienta eliminada.")).toBeVisible();
  await expect(page.getByTestId("tool-row")).toHaveCount(2);

  await page.reload();
  await expect(page.getByTestId("tool-row")).toHaveCount(2);
  await expect(toolRow(page, "5")).toHaveCount(0);
});

test("el hub resume el inventario y sin sesión no se entra", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await expect(
    page.getByText("Tenés 2 herramientas guardadas."),
  ).toBeVisible();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto("/mi-tejido/herramientas");
  await expect(visitorPage).toHaveURL(/\/ingresar\?volver=/);
  await visitor.close();
});
