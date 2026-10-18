import { expect, test, type Page } from "@playwright/test";

/**
 * Inventario de lana (spec §5.7): carga libre y lana del catálogo (con los
 * metros sugeridos desde la etiqueta y foto propia en R2), filtros por color
 * y grosor, edición, borrado, resumen en el hub y privacidad. Usa su propia
 * cuenta para no depender de otros tests.
 */

const NAME = "Prueba Inventario";
const EMAIL = "e2e.inventario@ovillo.test";
const USERNAME = "e2einventario";
const PASSWORD = "tejido-e2e-1234";

const FREE_NAME = "Lana de la abuela";
const CATALOG_NAME = "Fil Piuma";

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

/** JPEG sintético en el navegador, como el que saca un celular. */
async function makePhoto(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("sin canvas");
    }
    const gradient = context.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, "#166534");
    gradient.addColorStop(1, "#a16207");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 800, 600);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((value) => resolve(value!), "image/jpeg", 0.92);
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });

  return {
    name: "lana.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

test("registro rápido de la cuenta de inventario", async ({ page }) => {
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

test("vacío: el hub invita y la hoja Crear abre el formulario", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByText("Todavía no cargaste lanas al inventario."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ver mis lanas" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/lanas$/);
  await expect(page.getByText("Todavía no hay lanas")).toBeVisible();

  // La hoja *Crear* del botón central lleva al formulario ya abierto.
  await page.goto("/mi-tejido");
  await page.getByRole("button", { name: "Crear" }).first().click();
  await page.getByRole("link", { name: "Lana al inventario" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/lanas\?nueva=1$/);
  await expect(page.getByTestId("stash-new-form")).toBeVisible();
});

test("alta: carga libre con color, grosor y ubicación", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");

  await page.getByTestId("stash-new-cta").click();
  await page.getByTestId("stash-source-free").click();
  await page.getByTestId("stash-custom-name").fill(FREE_NAME);
  await page.getByTestId("stash-weight-dk").click();
  await page.getByTestId("stash-color-rojo").click();
  await page.getByTestId("stash-colorway").fill("Rojo coral");
  await page.getByTestId("stash-skeins").fill("3");
  await page.getByTestId("stash-location").fill("Caja azul");
  await page.getByTestId("stash-notes").fill("La guardaba mi abuela.");
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();

  const row = stashRow(page, FREE_NAME);
  await expect(row).toBeVisible();
  await expect(row.getByTestId("stash-row-quantity")).toHaveText("3 ovillos");
  await expect(row.getByTestId("stash-row-available")).toHaveText(
    "Disponible: 3 de 3 ovillos",
  );
  await expect(row.getByTestId("stash-row-color")).toHaveText("Rojo coral");
  await expect(row).toContainText("Mediana fina (DK)");
  await expect(row.getByTestId("stash-row-location")).toHaveText(
    "En Caja azul",
  );
  await expect(page.getByTestId("stash-count")).toHaveText("1 lana");
});

test("alta: lana del catálogo con metros sugeridos y foto", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");

  await page.getByTestId("stash-new-cta").click();
  // Del catálogo viene elegido por defecto.
  await page.getByTestId("stash-yarn").selectOption({
    label: "Katia · Fil Piuma",
  });
  await expect(page.getByTestId("stash-yarn-suggestion")).toContainText(
    "≈ 400 m y 150 g por ovillo",
  );
  await page.getByTestId("stash-color-verde").click();
  await page.getByTestId("stash-colorway").fill("Verde agua");
  await page.getByTestId("stash-skeins").fill("2");
  // Los metros se completan solos desde la etiqueta (2 × 400).
  await expect(page.getByTestId("stash-meters")).toHaveValue("800");

  const photo = await makePhoto(page);
  await page.getByTestId("stash-photo-input").setInputFiles(photo);
  await expect(page.getByTestId("stash-photo-preview")).toBeVisible();
  await page.getByTestId("stash-save").click();
  await expect(page.getByText("¡Lana guardada!")).toBeVisible();

  const row = stashRow(page, CATALOG_NAME);
  await expect(row).toBeVisible();
  // La marca viene del catálogo; los gramos los completó el servidor.
  await expect(row).toContainText("Katia");
  await expect(row.getByTestId("stash-row-quantity")).toHaveText(
    "2 ovillos · 300 g · 800 m",
  );
  await expect(row.getByTestId("stash-row-available")).toHaveText(
    "Disponible: 2 de 2 ovillos",
  );

  // La foto llega de verdad desde R2.
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>(
      '[data-testid="stash-row-photo"]',
    );
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
});

test("filtros: búsqueda, color y grosor", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");
  await expect(page.getByTestId("stash-row")).toHaveCount(2);

  await page.getByTestId("stash-search").fill("abuela");
  await expect(page.getByTestId("stash-row")).toHaveCount(1);
  await expect(stashRow(page, FREE_NAME)).toBeVisible();

  await page.getByTestId("stash-search").fill("sin coincidencias");
  await expect(page.getByTestId("stash-filter-empty")).toBeVisible();

  await page.getByTestId("stash-search").fill("");
  await page.getByTestId("stash-filter-color-verde").click();
  await expect(page.getByTestId("stash-row")).toHaveCount(1);
  await expect(stashRow(page, CATALOG_NAME)).toBeVisible();

  await page.getByTestId("stash-filter-color-todos").click();
  await expect(page.getByTestId("stash-row")).toHaveCount(2);

  // Solo se ofrecen los grosores que hay en el inventario (los dos son DK).
  await expect(page.getByTestId("stash-filter-weight-dk")).toBeVisible();
  await expect(page.getByTestId("stash-filter-weight-bulky")).toHaveCount(0);
  await page.getByTestId("stash-filter-weight-dk").click();
  await expect(page.getByTestId("stash-row")).toHaveCount(2);
});

test("editar: cambia la cantidad y quita la foto", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");

  const row = stashRow(page, CATALOG_NAME);
  await row.getByTestId("stash-edit").click();
  const form = row.getByTestId("stash-edit-form");
  await form.getByTestId("stash-skeins").fill("1");
  await form.getByTestId("stash-meters").fill("400");
  await form.getByTestId("stash-save").click();
  await expect(page.getByText("Lana actualizada.")).toBeVisible();

  const updated = stashRow(page, CATALOG_NAME);
  await expect(updated.getByTestId("stash-row-available")).toHaveText(
    "Disponible: 1 de 1 ovillo",
  );

  // Quitar la foto borra el objeto de R2 y la fila queda sin imagen.
  await updated.getByTestId("stash-edit").click();
  const editForm = updated.getByTestId("stash-edit-form");
  await editForm.getByTestId("stash-photo-remove").click();
  await editForm.getByTestId("stash-save").click();
  await expect(page.getByText("Lana actualizada.")).toBeVisible();
  await expect(
    stashRow(page, CATALOG_NAME).getByTestId("stash-row-photo"),
  ).toHaveCount(0);
});

test("borrar: pide confirmación y desaparece", async ({ page }) => {
  await signIn(page);
  await page.goto("/mi-tejido/lanas");

  const row = stashRow(page, FREE_NAME);
  await row.getByTestId("stash-delete").click();
  await expect(
    row.getByText("¿Eliminar esta lana del inventario?"),
  ).toBeVisible();
  await row.getByTestId("stash-delete-confirm").click();
  await expect(page.getByText("Lana eliminada.")).toBeVisible();
  await expect(page.getByTestId("stash-row")).toHaveCount(1);

  await page.reload();
  await expect(stashRow(page, FREE_NAME)).toHaveCount(0);
});

test("el hub resume el inventario y sin sesión no se entra", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await expect(
    page.getByText("Tenés 1 lana guardada en el inventario."),
  ).toBeVisible();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto("/mi-tejido/lanas");
  await expect(visitorPage).toHaveURL(/\/ingresar\?volver=/);
  await visitor.close();
});
