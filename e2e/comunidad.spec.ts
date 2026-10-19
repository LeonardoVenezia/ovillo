import { expect, test, type Page } from "@playwright/test";

/**
 * Comunidad de punta a punta (spec §5.9): los grupos oficiales se ven sin
 * sesión, una cuenta crea un grupo abierto y otra se suma, un grupo con
 * aprobación pasa por la solicitud, y quien lo creó edita y nombra
 * moderadores. Usa sus propias cuentas (A y B) para no depender de otros
 * tests.
 */

const NAME_A = "Prueba Comunidad A";
const EMAIL_A = "e2e.comunidad@ovillo.test";
const USERNAME_A = "e2ecomunidad";
const NAME_B = "Prueba Comunidad B";
const EMAIL_B = "e2e.comunidad2@ovillo.test";
const USERNAME_B = "e2ecomunidad2";
const PASSWORD = "tejido-e2e-1234";

const OPEN_GROUP = "Grupo abierto e2e";
const OPEN_GROUP_SLUG = "grupo-abierto-e2e";
const RENAMED_GROUP = "Grupo abierto e2e renombrado";
const APPROVAL_GROUP = "Grupo con aprobacion e2e";
const APPROVAL_GROUP_SLUG = "grupo-con-aprobacion-e2e";

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

test("los grupos oficiales se ven sin sesión y el que no existe da 404", async ({
  page,
}) => {
  await page.goto("/comunidad");
  await expect(
    page.getByRole("heading", { name: "Comunidad", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("group-card").first()).toBeVisible();

  // El directorio busca por texto y filtra por categoría desde la URL.
  await page.getByRole("link", { name: "Ver todos los grupos" }).click();
  await expect(page).toHaveURL(/\/grupos$/);
  await expect(page.getByTestId("groups-count")).toContainText("grupos");

  await page.getByTestId("group-search").fill("amigurumis");
  await page.getByTestId("group-search-submit").click();
  await expect(page).toHaveURL(/q=amigurumis/);
  await expect(page.getByTestId("groups-count")).toContainText("1 grupo");

  // La ficha pública invita a ingresar en lugar de unirse.
  await page.goto("/grupos/amigurumis");
  await expect(page.getByRole("heading", { name: "Amigurumis" })).toBeVisible();
  await expect(page.getByTestId("group-sign-in")).toBeVisible();

  const response = await page.goto("/grupos/grupo-que-no-existe-e2e");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});

test("la cuenta A crea un grupo abierto y ya es parte", async ({ page }) => {
  await register(page, NAME_A, USERNAME_A, EMAIL_A);

  await page.goto("/grupos/nuevo");
  await page.getByTestId("group-name-input").fill(OPEN_GROUP);
  await page
    .getByTestId("group-description-input")
    .fill("Para probar la comunidad de punta a punta.");
  await page.getByTestId("group-submit").click();

  await expect(page).toHaveURL(new RegExp(`/grupos/${OPEN_GROUP_SLUG}$`));
  await expect(page.getByText("¡Grupo creado!")).toBeVisible();
  await expect(page.getByTestId("group-meta")).toContainText("1 integrante");
  await expect(page.getByTestId("group-members")).toContainText(NAME_A);

  // Quien creó el grupo no ve el botón de salir: ve la nota.
  await expect(page.getByTestId("group-join-button")).toHaveCount(0);
  await expect(
    page.getByText("Quien creó el grupo no puede salir."),
  ).toBeVisible();

  // Aparece en "Tus grupos" y marcado en el directorio.
  await page.goto("/comunidad");
  const mine = page.getByTestId("group-card").filter({ hasText: OPEN_GROUP });
  await expect(mine).toBeVisible();
  await expect(mine).toContainText("Ya sos parte");
});

test("la cuenta B se une al grupo abierto y el contador sube", async ({
  browser,
  page,
}) => {
  await signIn(page, EMAIL_A);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await register(pageB, NAME_B, USERNAME_B, EMAIL_B);

  await pageB.goto("/grupos");
  await pageB.getByTestId("group-search").fill(OPEN_GROUP);
  await pageB.getByTestId("group-search-submit").click();
  await pageB.getByTestId("group-card").filter({ hasText: OPEN_GROUP }).click();

  await pageB.getByTestId("group-join-button").click();
  await expect(
    pageB.getByText("¡Listo! Ya sos parte del grupo."),
  ).toBeVisible();
  await expect(pageB.getByTestId("group-meta")).toContainText("2 integrantes");
  await expect(pageB.getByTestId("group-members")).toContainText(NAME_B);

  // La ficha de A ve lo mismo.
  await page.goto(`/grupos/${OPEN_GROUP_SLUG}`);
  await expect(page.getByTestId("group-meta")).toContainText("2 integrantes");
  await expect(page.getByTestId("group-members")).toContainText(NAME_B);

  await contextB.close();
});

test("grupo con aprobación: B pide unirse, A acepta y B después sale", async ({
  browser,
  page,
}) => {
  await signIn(page, EMAIL_A);

  await page.goto("/grupos/nuevo");
  await page.getByTestId("group-name-input").fill(APPROVAL_GROUP);
  await page.getByRole("radio", { name: /Con aprobación/ }).check();
  await page.getByTestId("group-submit").click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${APPROVAL_GROUP_SLUG}$`));

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signIn(pageB, EMAIL_B);

  await pageB.goto(`/grupos/${APPROVAL_GROUP_SLUG}`);
  await expect(pageB.getByTestId("group-meta")).toContainText("1 integrante");
  await pageB.getByTestId("group-join-button").click();
  await expect(
    pageB.getByText(
      "Pediste unirte. Los moderadores van a revisar tu solicitud.",
    ),
  ).toBeVisible();
  await expect(
    pageB.getByRole("button", { name: "Cancelar solicitud" }),
  ).toBeVisible();
  await expect(pageB.getByTestId("group-meta")).toContainText("1 integrante");

  // A ve la solicitud y la acepta.
  await page.reload();
  await expect(page.getByTestId("group-pending")).toContainText(NAME_B);
  await page.getByTestId("group-approve").click();
  await expect(
    page.getByText("Aceptada: ya es parte del grupo."),
  ).toBeVisible();
  await expect(page.getByTestId("group-pending")).toHaveCount(0);
  await expect(page.getByTestId("group-meta")).toContainText("2 integrantes");

  // B ya es parte y puede salir del grupo.
  await pageB.reload();
  await pageB.getByRole("button", { name: "Salir del grupo" }).click();
  await expect(pageB.getByText("Saliste del grupo.")).toBeVisible();
  await expect(
    pageB.getByRole("button", { name: "Pedir unirme" }),
  ).toBeVisible();

  await contextB.close();
});

test("A edita el grupo y nombra moderadora a B", async ({ browser, page }) => {
  await signIn(page, EMAIL_A);

  // Edición: cambia el nombre y el slug queda igual.
  await page.goto(`/grupos/${OPEN_GROUP_SLUG}/editar`);
  await page.getByTestId("group-name-input").fill(RENAMED_GROUP);
  await page.getByTestId("group-submit").click();
  await expect(page.getByText("Listo, guardamos los cambios.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/grupos/${OPEN_GROUP_SLUG}$`));
  await expect(
    page.getByRole("heading", { name: RENAMED_GROUP }),
  ).toBeVisible();

  // A nombra moderadora a B desde la lista de integrantes.
  const row = page
    .getByTestId("group-members")
    .locator("li")
    .filter({ hasText: NAME_B });
  await row.getByTestId("member-role-button").click();
  await expect(page.getByText("Ahora modera el grupo.")).toBeVisible();
  await expect(row.getByTestId("member-role-button")).toHaveText(
    "Quitar moderador/a",
  );

  // B, ahora moderadora, ve el botón de editar la ficha.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signIn(pageB, EMAIL_B);
  await pageB.goto(`/grupos/${OPEN_GROUP_SLUG}`);
  await expect(pageB.getByTestId("group-edit")).toBeVisible();
  await expect(
    pageB.getByRole("button", { name: "Salir del grupo" }),
  ).toBeVisible();

  // A le quita la moderación.
  await row.getByTestId("member-role-button").click();
  await expect(page.getByText("Ya no modera el grupo.")).toBeVisible();

  await contextB.close();
});
