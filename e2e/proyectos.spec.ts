import { expect, test, type Page } from "@playwright/test";

/**
 * Proyectos de punta a punta (spec §5.3): se crea con lo mínimo, aparece en
 * Mi tejido y en el perfil público, cambia de estado y respeta la
 * privacidad. Usa su propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Proyectos";
const EMAIL = "e2e.proyectos@ovillo.test";
const USERNAME = "e2eproyectos";
const PASSWORD = "tejido-e2e-1234";
const PROJECT = "Gorro e2e";
const SLUG = "gorro-e2e";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("registro rápido de la cuenta de proyectos", async ({ page }) => {
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

test("crear: con el nombre alcanza y queda en Mi tejido", async ({ page }) => {
  await signIn(page);

  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();

  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));
  await expect(page.getByRole("heading", { name: PROJECT })).toBeVisible();
  await expect(page.getByText("¡Proyecto creado!")).toBeVisible();

  // El hub lo resume y lo muestra.
  await page.goto("/mi-tejido");
  await expect(page.getByText("1 tejiendo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(PROJECT) }),
  ).toBeVisible();
});

test("estado: se marca terminado y la página lo refleja", async ({ page }) => {
  await signIn(page);

  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  await page.getByRole("button", { name: "Terminado" }).click();
  await expect(
    page.getByText("¡Felicitaciones! Un proyecto más terminado."),
  ).toBeVisible();
  await expect(page.getByText("Terminado el")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Terminado", pressed: true }),
  ).toBeVisible();
});

test("público: se ve sin sesión y el cambio a privado se respeta", async ({
  page,
  browser,
}) => {
  // Público por defecto: sin sesión se ve la página del proyecto…
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/@${USERNAME}/proyectos/${SLUG}`);
  await expect(
    visitorPage.getByRole("heading", { name: PROJECT }),
  ).toBeVisible();

  // …y el perfil público lo lista.
  await visitorPage.goto(`/@${USERNAME}`);
  await expect(
    visitorPage.getByRole("heading", { name: "Proyectos" }),
  ).toBeVisible();
  await expect(
    visitorPage.getByRole("link", { name: new RegExp(PROJECT) }),
  ).toBeVisible();
  await visitor.close();

  // Pasa a privado desde Editar.
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}/editar`);
  await page.getByRole("radio", { name: /Solo para mí/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));
  await expect(page.getByText("¡Proyecto guardado!")).toBeVisible();

  // Quien visita ve el aviso, no el proyecto.
  const visitor2 = await browser.newContext();
  const visitorPage2 = await visitor2.newPage();
  await visitorPage2.goto(`/@${USERNAME}/proyectos/${SLUG}`);
  await expect(
    visitorPage2.getByText("Este proyecto es privado"),
  ).toBeVisible();
  await expect(
    visitorPage2.getByRole("heading", { name: PROJECT }),
  ).toHaveCount(0);
  await visitor2.close();
});

test("un proyecto que no existe da 404", async ({ page }) => {
  const response = await page.goto(`/@${USERNAME}/proyectos/no-existe`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});
