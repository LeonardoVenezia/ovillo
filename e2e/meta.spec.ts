import { expect, test, type Page } from "@playwright/test";

/**
 * "Mi año tejiendo" de punta a punta (spec §5.14): un proyecto terminado con
 * lana suma al resumen (metros y lana más usada), la meta se anota, se
 * cambia y se quita, el hub la resume y el perfil público la muestra. Usa su
 * propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Mi Año";
const EMAIL = "e2e.meta@ovillo.test";
const USERNAME = "e2emeta";
const PASSWORD = "tejido-e2e-1234";

const STASH_OPTION = "Fil Piuma · Katia";
const PROJECT = "Proyecto del año";
const PROJECT_SLUG = "proyecto-del-ano";
const YEAR = String(new Date().getFullYear());

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
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

test("registro rápido de la cuenta de Mi año", async ({ page }) => {
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

test("resumen: un proyecto terminado con lana suma metros y lana más usada", async ({
  page,
}) => {
  await signIn(page);

  // Lana del catálogo (Fil Piuma: 400 m y 150 g por ovillo), 1 ovillo.
  await page.goto("/mi-tejido/lanas");
  await page.getByTestId("stash-new-cta").click();
  await page
    .getByTestId("stash-yarn")
    .selectOption({ label: "Katia · Fil Piuma" });
  await page.getByTestId("stash-color-verde").click();
  await page.getByTestId("stash-skeins").fill("1");
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();

  // Proyecto con esa lana, y terminado.
  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/mi-tejido/proyectos/${PROJECT_SLUG}$`),
  );

  await page.getByTestId("project-yarn-add").click();
  await selectByText(page, "project-yarn-stash-select", STASH_OPTION);
  await page.getByTestId("project-yarn-skeins").fill("1");
  await page.getByTestId("project-yarn-submit").click();
  await expect(page.getByText("¡Lana sumada al proyecto!")).toBeVisible();

  await page.getByRole("button", { name: "Terminado" }).click();
  await expect(
    page.getByText("¡Felicitaciones! Un proyecto más terminado."),
  ).toBeVisible();

  // La meta del año: anoto 2 y el progreso queda 1 de 2.
  await page.goto("/mi-tejido/meta");
  await expect(
    page.getByText("Todavía no anotaste tu meta del año."),
  ).toBeVisible();
  await page.getByTestId("goal-set").click();
  await page.getByTestId("goal-target").fill("2");
  await page.getByRole("button", { name: "Guardar meta" }).click();
  await expect(page.getByText("¡Meta guardada!")).toBeVisible();
  await expect(page.getByTestId("goal-progress")).toHaveText(
    `Vas 1 de 2 proyectos terminados en ${YEAR}.`,
  );

  // El resumen del año suma la lana: 1 × 400 m, y Fil Piuma como la más usada.
  await expect(page.getByTestId("year-summary-finished")).toHaveText(
    "1 proyecto",
  );
  await expect(page.getByTestId("year-summary-meters")).toHaveText("400 m");
  await expect(page.getByTestId("year-summary-top-yarn")).toContainText(
    "Fil Piuma · Katia",
  );
  await expect(page.getByTestId("year-summary-top-yarn")).toContainText(
    "400 m",
  );

  // El hub lo resume y lleva a la página de la meta.
  await page.goto("/mi-tejido");
  await expect(
    page.getByText(`Vas 1 de 2 proyectos terminados en ${YEAR}.`),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver mi año" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/meta$/);

  // El perfil público muestra el progreso y el resumen.
  await page.goto(`/@${USERNAME}`);
  const year = page.getByTestId("profile-year");
  await expect(year).toBeVisible();
  await expect(year).toContainText(
    `Vas 1 de 2 proyectos terminados en ${YEAR}.`,
  );
  await expect(year).toContainText("Fil Piuma · Katia");
});

test("meta: se cambia, se cumple y se quita", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/meta");

  await page.getByTestId("goal-change").click();
  await page.getByTestId("goal-target").fill("1");
  await page.getByRole("button", { name: "Guardar meta" }).click();
  await expect(page.getByText("¡Meta guardada!")).toBeVisible();
  await expect(page.getByTestId("goal-progress")).toHaveText(
    `¡Meta cumplida: 1 de 1 proyectos terminados en ${YEAR}!`,
  );

  // Sin meta, el resumen queda: el hub cuenta lo terminado del año.
  await page.getByTestId("goal-remove").click();
  await expect(page.getByText("Quitamos tu meta del año.")).toBeVisible();
  await expect(
    page.getByText("Todavía no anotaste tu meta del año."),
  ).toBeVisible();
  await expect(page.getByTestId("year-summary-finished")).toHaveText(
    "1 proyecto",
  );

  await page.goto("/mi-tejido");
  await expect(
    page.getByText(`Terminaste 1 proyecto en ${YEAR}.`),
  ).toBeVisible();

  // El perfil sigue mostrando el resumen, sin barra de progreso.
  await page.goto(`/@${USERNAME}`);
  await expect(page.getByTestId("profile-year")).toContainText("1 proyecto");
  await expect(page.getByTestId("profile-year")).not.toContainText("Vas ");
});
