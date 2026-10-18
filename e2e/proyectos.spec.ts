import { expect, test, type Page } from "@playwright/test";

/**
 * Proyectos de punta a punta (spec §5.3): se crea con lo mínimo, aparece en
 * Mi tejido y en el perfil público, cambia de estado y respeta la
 * privacidad. También cubre el vínculo con la biblioteca de patrones
 * (spec §5.5): empezar desde un patrón y verlo en la galería de la
 * comunidad, y la galería pública de proyectos (`/explorar/proyectos`).
 * Usa su propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Proyectos";
const EMAIL = "e2e.proyectos@ovillo.test";
const USERNAME = "e2eproyectos";
const PASSWORD = "tejido-e2e-1234";
const PROJECT = "Gorro e2e";
const SLUG = "gorro-e2e";
/** Proyecto que nace vinculado a un patrón de la siembra. */
const PATTERN_PROJECT = "Gorro con patrón";
const PATTERN_PROJECT_SLUG = "gorro-con-patron";
const PATTERN_SLUG = "malu-hat";

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

test("desde un patrón: empezar proyecto lo vincula y aparece en la galería", async ({
  page,
  browser,
}) => {
  await signIn(page);

  // "Empezar proyecto" en la ficha abre el formulario con el patrón elegido.
  await page.goto(`/patrones/${PATTERN_SLUG}`);
  await page.getByTestId("pattern-start-project").click();
  await expect(page).toHaveURL(
    new RegExp(`/mi-tejido/proyectos/nuevo\\?patron=${PATTERN_SLUG}$`),
  );
  await expect(page.locator("#patternId option:checked")).toContainText(
    "Malu Hat",
  );

  await page.getByLabel("Nombre").fill(PATTERN_PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/mi-tejido/proyectos/${PATTERN_PROJECT_SLUG}$`),
  );
  // La página propia enlaza a la ficha del patrón.
  await expect(page.getByTestId("project-pattern-link")).toHaveAttribute(
    "href",
    `/patrones/${PATTERN_SLUG}`,
  );

  // Y cualquiera lo ve en "Hechos por la comunidad", sin sesión.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/patrones/${PATTERN_SLUG}`);
  await expect(
    visitorPage.getByRole("heading", { name: "Hechos por la comunidad" }),
  ).toBeVisible();
  const card = visitorPage
    .getByTestId("community-project-card")
    .filter({ hasText: PATTERN_PROJECT });
  await expect(card).toBeVisible();
  await card.click();
  await expect(visitorPage).toHaveURL(new RegExp(`${PATTERN_PROJECT_SLUG}$`));
  await expect(
    visitorPage.getByRole("heading", { name: PATTERN_PROJECT }),
  ).toBeVisible();
  await visitor.close();
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

  // …y el perfil público lo lista (heading exacto: "Prueba Proyectos" no cuenta).
  await visitorPage.goto(`/@${USERNAME}`);
  await expect(
    visitorPage.getByRole("heading", { name: "Proyectos", exact: true }),
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

test("explorar: la galería pública filtra por nombre y estado", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  // El hub lleva a la galería de proyectos y muestra tarjetas.
  await page.goto("/explorar");
  await page.getByTestId("explore-proyectos-card").click();
  await expect(page).toHaveURL(/\/explorar\/proyectos$/);
  await expect(
    page.getByTestId("community-project-card").first(),
  ).toBeVisible();

  // La búsqueda encuentra el proyecto por su nombre.
  await page.getByTestId("community-search").fill(PATTERN_PROJECT);
  await expect(page.getByTestId("community-projects-count")).toHaveText(
    "1 proyecto",
  );

  // Con un estado que no es el suyo no queda nada, y limpiar vuelve atrás.
  await page.getByTestId("community-filter-estado").selectOption("terminado");
  await expect(page.getByText("No encontramos proyectos así")).toBeVisible();
  await page.getByTestId("community-clear-filters").click();
  await expect(
    page.getByTestId("community-project-card").first(),
  ).toBeVisible();

  await visitor.close();
});

test("un proyecto que no existe da 404", async ({ page }) => {
  const response = await page.goto(`/@${USERNAME}/proyectos/no-existe`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});
