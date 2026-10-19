import { expect, test, type Page } from "@playwright/test";

/**
 * Guardados y colecciones de punta a punta (spec §5.8): guardar patrón, lana
 * y proyecto desde las fichas, el hub que cuenta, colecciones con
 * visibilidad (la pública se ve en el perfil, la privada no), mover,
 * borrar colección sin perder guardados y quitar un guardado. Usa su propia
 * cuenta para no depender de otros tests.
 */

const NAME = "Prueba Guardados";
const EMAIL = "e2e.guardados@ovillo.test";
const USERNAME = "e2eguardados";
const PASSWORD = "tejido-e2e-1234";

const PATTERN = "Malu Hat";
const PROJECT = "Proyecto guardado";
const PROJECT_SLUG = "proyecto-guardado";
const COLLECTION_PUBLIC = "Favoritos";
const COLLECTION_PRIVATE = "Solo para mí";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("registro rápido de la cuenta de guardados", async ({ page }) => {
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

test("guardar: patrón, lana y proyecto propio desde las fichas", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/patrones/malu-hat");
  await page.getByTestId("save-toggle").click();
  await expect(page.getByTestId("save-toggle")).toHaveText("Guardado");
  await expect(page.getByText("¡Guardado!")).toBeVisible();

  await page.goto("/lanas/katia/fil-piuma");
  await page.getByTestId("save-toggle").click();
  await expect(page.getByTestId("save-toggle")).toHaveText("Guardado");

  // Un proyecto propio se guarda desde su página pública.
  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/mi-tejido/proyectos/${PROJECT_SLUG}$`),
  );
  await page.goto(`/@${USERNAME}/proyectos/${PROJECT_SLUG}`);
  await page.getByTestId("save-toggle").click();
  await expect(page.getByTestId("save-toggle")).toHaveText("Guardado");

  // El hub lo cuenta y la lista los muestra a los tres con su etiqueta.
  await page.goto("/mi-tejido");
  await expect(page.getByText("Tenés 3 cosas guardadas.")).toBeVisible();
  await page.getByRole("link", { name: "Ver mis guardados" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/guardados$/);

  const rows = page.getByTestId("saved-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: PATTERN })).toContainText("Patrón");
  await expect(rows.filter({ hasText: PROJECT })).toContainText("Proyecto");
  await expect(rows.filter({ hasText: "Fil Piuma" })).toContainText("Lana");
});

test("colección pública: se crea, se mueve y se ve en el perfil", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/guardados");

  await page.getByTestId("collection-new").click();
  await page.getByTestId("collection-name").fill(COLLECTION_PUBLIC);
  await page.getByTestId("collection-visibility-public").click();
  await page.getByTestId("collection-submit").click();
  await expect(page.getByText("¡Colección creada!")).toBeVisible();
  await expect(page.getByTestId("saved-filter-collection")).toContainText(
    COLLECTION_PUBLIC,
  );

  const patternRow = page.getByTestId("saved-row").filter({ hasText: PATTERN });
  await patternRow
    .getByTestId("saved-move-select")
    .selectOption({ label: COLLECTION_PUBLIC });
  await expect(page.getByText("Guardado movido.")).toBeVisible();

  // El chip filtra y muestra la colección con su visibilidad.
  await page.getByTestId("saved-filter-collection").click();
  await expect(page.getByTestId("collection-detail")).toContainText(
    COLLECTION_PUBLIC,
  );
  await expect(page.getByTestId("collection-detail")).toContainText("Pública");
  await expect(page.getByTestId("saved-row")).toHaveCount(1);
  await expect(page.getByTestId("saved-row")).toContainText(PATTERN);

  // La sección "Guardados" del perfil la muestra.
  await page.goto(`/@${USERNAME}`);
  await expect(page.getByTestId("profile-collections")).toBeVisible();
  await expect(page.getByTestId("profile-collection")).toContainText(
    COLLECTION_PUBLIC,
  );
  await expect(page.getByTestId("profile-collection")).toContainText(PATTERN);
});

test("colección privada: no se ve en el perfil y borrarla no pierde nada", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/guardados");

  await page.getByTestId("collection-new").click();
  await page.getByTestId("collection-name").fill(COLLECTION_PRIVATE);
  // Privada viene elegida por defecto.
  await page.getByTestId("collection-submit").click();
  await expect(page.getByText("¡Colección creada!")).toBeVisible();

  const yarnRow = page.getByTestId("saved-row").filter({ hasText: "Fil Piuma" });
  await yarnRow
    .getByTestId("saved-move-select")
    .selectOption({ label: COLLECTION_PRIVATE });
  await expect(page.getByText("Guardado movido.")).toBeVisible();

  // El perfil público solo muestra la colección pública.
  await page.goto(`/@${USERNAME}`);
  await expect(page.getByTestId("profile-collection")).toHaveCount(1);
  await expect(page.getByTestId("profile-collections")).not.toContainText(
    COLLECTION_PRIVATE,
  );

  // Borrar la colección: la lana queda en "Sin colección".
  await page.goto("/mi-tejido/guardados");
  await page
    .getByTestId("saved-filter-collection")
    .filter({ hasText: COLLECTION_PRIVATE })
    .click();
  await page.getByTestId("collection-delete").click();
  await page.getByTestId("collection-delete-confirm").click();
  await expect(page.getByText(/Colección eliminada/)).toBeVisible();

  await page.getByTestId("saved-filter-none").click();
  await expect(
    page.getByTestId("saved-row").filter({ hasText: "Fil Piuma" }),
  ).toBeVisible();
});

test("quitar: sale de guardados", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/guardados");

  await page.getByTestId("saved-filter-all").click();
  await expect(page.getByTestId("saved-row")).toHaveCount(3);

  const patternRow = page.getByTestId("saved-row").filter({ hasText: PATTERN });
  await patternRow.getByTestId("saved-remove").click();
  await expect(page.getByText("Quitado de guardados.")).toBeVisible();
  await expect(page.getByTestId("saved-row")).toHaveCount(2);
});
