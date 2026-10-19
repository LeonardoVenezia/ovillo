import { expect, test, type Page } from "@playwright/test";

/**
 * Lanas y herramientas en los proyectos (spec §5.3, D-045): asignar del
 * inventario descuenta el disponible (y quitarla lo devuelve), del catálogo
 * solo referencia, la herramienta es informativa. También cubre la galería
 * "Hechos por la comunidad" de la ficha de lana (spec §5.6) y el filtro
 * "Con mi lana" del buscador de patrones. Usa su propia cuenta para no
 * depender de otros tests.
 */

const NAME = "Prueba Proyecto Lanas";
const EMAIL = "e2e.proyectolanas@ovillo.test";
const USERNAME = "e2eproyectolanas";
const PASSWORD = "tejido-e2e-1234";
const PROJECT = "Proyecto lanas e2e";
const SLUG = "proyecto-lanas-e2e";
const YARN_NAME = "Fil Piuma";
const FREE_NAME = "Lana sin metros";
const PATTERN_NAME = "Bufanda fácil en Fil Piuma";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

/** La tarjeta de una lana por su nombre. */
function stashRow(page: Page, name: string) {
  return page.locator('[data-testid="stash-row"]').filter({ hasText: name });
}

/** Elige en un `<select>` la opción que contiene cierto texto (por su value). */
async function selectByText(page: Page, testId: string, text: string) {
  const select = page.getByTestId(testId);
  const value = await select
    .locator("option", { hasText: text })
    .first()
    .getAttribute("value");
  await select.selectOption(value!);
}

test("registro rápido de la cuenta de proyecto con lanas", async ({ page }) => {
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

test("inventario: una lana del catálogo y una carga libre sin metros", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");

  // Del catálogo: 2 ovillos de Fil Piuma (los metros los completa la etiqueta).
  await page.getByTestId("stash-new-cta").click();
  await page
    .getByTestId("stash-yarn")
    .selectOption({ label: "Katia · Fil Piuma" });
  await page.getByTestId("stash-color-verde").click();
  await page.getByTestId("stash-skeins").fill("2");
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();
  await expect(
    stashRow(page, YARN_NAME).getByTestId("stash-row-available"),
  ).toHaveText("Disponible: 2 de 2 ovillos");

  // Carga libre con grosor pero sin metros: no puede cruzar metraje.
  await page.getByTestId("stash-new-cta").click();
  await page.getByTestId("stash-source-free").click();
  await page.getByTestId("stash-custom-name").fill(FREE_NAME);
  await page.getByTestId("stash-weight-dk").click();
  await page.getByTestId("stash-skeins").fill("2");
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();
  await expect(page.getByTestId("stash-row")).toHaveCount(2);
});

test("herramienta: una circular de 4 mm", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/herramientas");

  await page.getByTestId("tool-new-cta").click();
  await page.getByTestId("tool-kind-circulares").click();
  await page.getByTestId("tool-size").fill("4");
  await page.getByTestId("tool-cable").fill("80");
  await page.getByTestId("tool-save").click();
  await expect(page.getByText("¡Herramienta guardada!")).toBeVisible();
});

test("proyecto: la lana del inventario descuenta y la herramienta se marca", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));

  // Lanas: el estado vacío invita y el formulario arranca en el inventario.
  await expect(page.getByTestId("project-yarns-empty")).toBeVisible();
  await page.getByTestId("project-yarn-add").click();
  await selectByText(page, "project-yarn-stash-select", YARN_NAME);
  await page.getByTestId("project-yarn-skeins").fill("1");
  await page.getByTestId("project-yarn-submit").click();
  await expect(page.getByText("¡Lana sumada al proyecto!")).toBeVisible();

  const yarnRow = page
    .getByTestId("project-yarn-row")
    .filter({ hasText: YARN_NAME });
  await expect(yarnRow).toContainText("Del inventario");
  await expect(yarnRow.getByTestId("project-yarn-usage")).toHaveText(
    "1 ovillo",
  );
  await expect(yarnRow.getByTestId("project-yarn-available")).toHaveText(
    "Disponible: 1 de 2 ovillos",
  );

  // Herramientas: se suman del inventario y no descuentan nada.
  await selectByText(page, "project-tool-select", "Agujas circulares");
  await page.getByTestId("project-tool-add").click();
  await expect(
    page.getByText("¡Herramienta sumada al proyecto!"),
  ).toBeVisible();
  const toolRow = page.getByTestId("project-tool-row");
  await expect(toolRow).toContainText("Agujas circulares 4 mm");
  await expect(toolRow).toContainText("cable 80 cm");

  // El inventario refleja el descuento (se calcula, no se guarda: D-045).
  await page.goto("/mi-tejido/lanas");
  await expect(
    stashRow(page, YARN_NAME).getByTestId("stash-row-available"),
  ).toHaveText("Disponible: 1 de 2 ovillos");
});

test("galería: la ficha de la lana muestra el proyecto, sin sesión", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/lanas/katia/fil-piuma");
  await expect(
    page.getByRole("heading", { name: "Hechos por la comunidad" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("community-project-card").filter({ hasText: PROJECT }),
  ).toBeVisible();

  await visitor.close();
});

test("Con mi lana: cruza el stock, avisa el exceso y vuelve al quitar", async ({
  page,
}) => {
  await signIn(page);

  // Con 1 de 2 ovillos asignados quedan 400 m: la bufanda en Fil Piuma entra.
  await page.goto("/explorar/patrones?lana=mia");
  const card = page
    .getByTestId("pattern-card")
    .filter({ hasText: PATTERN_NAME });
  await expect(card).toBeVisible();
  await expect(page.getByTestId("patterns-count")).toHaveText("1 patrón");

  // Todo asignado: sin metros no hay cruce posible y el vacío explica.
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const row = page
    .getByTestId("project-yarn-row")
    .filter({ hasText: YARN_NAME });
  await row.getByTestId("project-yarn-edit").click();
  await page.getByTestId("project-yarn-edit-skeins").fill("2");
  await page.getByTestId("project-yarn-edit-save").click();
  await expect(page.getByText("Cantidad actualizada.")).toBeVisible();
  await expect(row.getByTestId("project-yarn-available")).toHaveText(
    "Todo asignado a proyectos",
  );

  await page.goto("/explorar/patrones?lana=mia");
  await expect(
    page.getByText("Con tus lanas no alcanza todavía"),
  ).toBeVisible();

  // De más (3 de 2): avisa pero no bloquea (D-045).
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const overRow = page
    .getByTestId("project-yarn-row")
    .filter({ hasText: YARN_NAME });
  await overRow.getByTestId("project-yarn-edit").click();
  await page.getByTestId("project-yarn-edit-skeins").fill("3");
  await page.getByTestId("project-yarn-edit-save").click();
  await expect(overRow.getByTestId("project-yarn-available")).toContainText(
    "Asignaste más de lo que tenés",
  );

  // Quitar la lana la devuelve entera al inventario y el patrón reaparece.
  await overRow.getByTestId("project-yarn-remove").click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await expect(page.getByText("Lana quitada del proyecto")).toBeVisible();
  await expect(page.getByTestId("project-yarns-empty")).toBeVisible();

  await page.goto("/mi-tejido/lanas");
  await expect(
    stashRow(page, YARN_NAME).getByTestId("stash-row-available"),
  ).toHaveText("Disponible: 2 de 2 ovillos");

  await page.goto("/explorar/patrones?lana=mia");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: PATTERN_NAME }),
  ).toBeVisible();
});

test("sin sesión: el chip lleva al ingreso y la vuelta conserva el filtro", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  // Directo por URL: el vacío invita a ingresar.
  await page.goto("/explorar/patrones?lana=mia");
  await expect(
    page.getByText("Ingresá para ver qué podés tejer"),
  ).toBeVisible();

  // Y el chip, sin sesión, manda al ingreso con la vuelta armada.
  await page.goto("/explorar/patrones");
  await page.getByTestId("pattern-filter-lana-mia").click();
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fexplorar%2Fpatrones/);

  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/explorar\/patrones\?lana=mia$/);
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: PATTERN_NAME }),
  ).toBeVisible();

  await visitor.close();
});
