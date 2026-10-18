import { expect, test, type Page } from "@playwright/test";

/**
 * Biblioteca de patrones (spec §5.5, tramo 2 de la Fase 4): lista pública con
 * búsqueda y filtros, ficha con enlace a la fuente, propuesta sin exigir
 * email confirmado, aviso de "sin revisar" y edición de la propia.
 *
 * Usa su propia cuenta para no depender de otros tests. Los conteos (20
 * patrones) son de la siembra base (`pnpm db:seed-patterns`): si la siembra
 * crece, estos números se actualizan.
 */

const NAME = "Prueba Patrones";
const EMAIL = "e2e.patrones@ovillo.test";
const USERNAME = "e2epatrones";
const PASSWORD = "tejido-e2e-1234";
const PATTERN_NAME = "Prueba Patrón";
const PATTERN_URL = "https://ejemplo.test/patron-de-prueba";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

test("registro: crea la cuenta y ya puede sumar un patrón sin confirmar el email", async ({
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

  // A diferencia de las lanas, la spec §5.5 no pide email confirmado: el
  // formulario está disponible desde el primer momento.
  await page.goto("/explorar/patrones/proponer");
  await expect(page.getByTestId("pattern-form")).toBeVisible();
});

test("catálogo público: hub, lista, búsqueda sin acentos y filtros", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/explorar");
  await page.getByTestId("explore-patrones-card").click();
  await expect(page).toHaveURL(/\/explorar\/patrones$/);
  await expect(page.getByTestId("patterns-count")).toHaveText("20 patrones");
  await expect(page.getByTestId("pattern-card").first()).toBeVisible();

  // "granny" encuentra el chaleco de granny squares.
  await page.getByTestId("pattern-search").fill("granny");
  await expect(page.getByTestId("patterns-count")).toHaveText("1 patrón");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: "Granny Squares" }),
  ).toBeVisible();

  // "tono" encuentra "Oso Toño" (sin la ñ, con ella).
  await page.getByTestId("pattern-search").fill("tono");
  await expect(page.getByTestId("patterns-count")).toHaveText("1 patrón");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: "Oso Toño" }),
  ).toBeVisible();

  // Técnica crochet, y encima categoría amigurumis.
  await page.getByTestId("pattern-search").fill("");
  await page.getByTestId("pattern-filter-tecnica-crochet").click();
  await expect(page.getByTestId("patterns-count")).toHaveText("13 patrones");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: "Kokeshi" }),
  ).toBeVisible();
  await page.getByTestId("pattern-filter-categoria").selectOption("amigurumi");
  await expect(page.getByTestId("patterns-count")).toHaveText("4 patrones");

  // Limpiar deja todo de nuevo.
  await page.getByTestId("pattern-clear-filters").click();
  await expect(page.getByTestId("patterns-count")).toHaveText("20 patrones");

  // Dificultad 1 (muy fácil): los tres patrones de principiante.
  await page.getByTestId("pattern-filter-dificultad").selectOption("1");
  await expect(page.getByTestId("patterns-count")).toHaveText("3 patrones");

  await visitor.close();
});

test("orden y filtros avanzados: populares, idioma y chips activos", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/explorar/patrones");
  await expect(page.getByTestId("patterns-count")).toHaveText("20 patrones");

  // El orden por defecto es recientes; populares no pierde patrones.
  await page.getByTestId("pattern-order").selectOption("populares");
  await expect(page.getByTestId("patterns-count")).toHaveText("20 patrones");
  await expect(page.getByTestId("pattern-card").first()).toBeVisible();

  // Los filtros avanzados están detrás de "Más filtros".
  await page.getByTestId("pattern-more-filters").click();
  await expect(page.getByTestId("pattern-advanced")).toBeVisible();

  // Idioma: la siembra está en español, en inglés todavía no hay nada…
  await page.getByTestId("pattern-filter-idioma").selectOption("en");
  await expect(page.getByText("No encontramos patrones así")).toBeVisible();

  // …y el chip del filtro activo lo quita de un toque.
  await expect(page.getByTestId("pattern-active-language")).toBeVisible();
  await page.getByTestId("pattern-active-language").click();
  await expect(page.getByTestId("patterns-count")).toHaveText("20 patrones");

  await visitor.close();
});

test("ficha: datos verificados, enlace a la fuente y el 404 real de un patrón que no existe", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/patrones/chaleco-perla-y-silky-mohair");
  await expect(
    page.getByRole("heading", {
      name: "Chaleco de punto en Perla y Silky Mohair",
    }),
  ).toBeVisible();
  const detail = page.getByTestId("pattern-detail");
  await expect(detail).toContainText("Katia");
  await expect(detail).toContainText("Dos agujas");
  await expect(detail).toContainText("Prendas");
  await expect(detail).toContainText("Fácil (2/5)");
  await expect(detail).toContainText("5,5 mm");
  await expect(detail).toContainText("M a XXL");
  // Patrón de la siembra: no tiene aviso de "sin revisar".
  await expect(page.getByTestId("pattern-unreviewed-notice")).toHaveCount(0);
  await expect(page.getByTestId("pattern-source-link")).toHaveAttribute(
    "href",
    /katia\.com/,
  );

  await page.goto("/patrones/no-existe");
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();

  // Sin proyectos vinculados, la galería lo dice con todas las letras.
  await page.goto("/patrones/chaleco-xl");
  await expect(
    page.getByRole("heading", { name: "Hechos por la comunidad" }),
  ).toBeVisible();
  await expect(page.getByTestId("pattern-community-empty")).toBeVisible();

  await visitor.close();
});

test("proponer: datos completos y aviso de sin revisar", async ({ page }) => {
  await signIn(page);
  await page.goto("/explorar/patrones/proponer");

  await page.locator("#name").fill(PATTERN_NAME);
  await page.locator("#designer").fill("E2E Patrones");
  await page.locator("#source").fill(PATTERN_URL);
  await page.locator("#craft").selectOption("crochet");
  await page.locator("#category").selectOption("accesorios");
  await page.locator("#difficulty").selectOption("2");
  await page.locator("#weight").selectOption("dk");
  await page.locator("#yardage-min").fill("100");
  await page.locator("#yardage-max").fill("200");
  await page.locator("#needle-sizes").fill("4,5 mm");
  await page.locator("#sizes").fill("Talla única");
  await page.getByTestId("pattern-form-submit").click();

  await expect(page).toHaveURL(/\/patrones\/prueba-patron$/);
  await expect(page.getByRole("heading", { name: PATTERN_NAME })).toBeVisible();
  await expect(page.getByTestId("pattern-unreviewed-notice")).toBeVisible();
  await expect(
    page.locator('[data-slot="badge"]').filter({ hasText: "Sin revisar" }),
  ).toBeVisible();
  const detail = page.getByTestId("pattern-detail");
  await expect(detail).toContainText("Crochet");
  await expect(detail).toContainText("Accesorios");
  await expect(detail).toContainText("Fácil (2/5)");
  await expect(detail).toContainText("Mediana fina (DK)");
  await expect(detail).toContainText("100–200 m");
  await expect(detail).toContainText("4,5 mm");
  await expect(detail).toContainText("Talla única");
  await expect(detail.getByText("Lo sumó")).toBeVisible();
  await expect(page.getByTestId("pattern-source-link")).toHaveAttribute(
    "href",
    PATTERN_URL,
  );
  // Quien lo sumó puede editarlo.
  await expect(page.getByTestId("pattern-edit-link")).toBeVisible();
});

test("editar: corrige datos, mantiene el slug y sigue sin revisar", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/patrones/prueba-patron");
  await page.getByTestId("pattern-edit-link").click();
  await expect(page).toHaveURL(/\/patrones\/prueba-patron\/editar$/);

  await page.locator("#difficulty").selectOption("3");
  await page.locator("#weight").selectOption("worsted");
  await page.locator("#yardage-max").fill("250");
  await page.getByTestId("pattern-form-submit").click();

  await expect(page).toHaveURL(/\/patrones\/prueba-patron$/);
  const detail = page.getByTestId("pattern-detail");
  await expect(detail).toContainText("Intermedia (3/5)");
  await expect(detail).toContainText("Mediana (worsted)");
  await expect(detail).toContainText("100–250 m");
  await expect(page.getByTestId("pattern-unreviewed-notice")).toBeVisible();
});

test("la propuesta se ve al instante para el público", async ({ browser }) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();

  await page.goto("/patrones/prueba-patron");
  await expect(page.getByRole("heading", { name: PATTERN_NAME })).toBeVisible();
  await expect(page.getByTestId("pattern-unreviewed-notice")).toBeVisible();

  // Y aparece en la lista pública, filtrable por grosor.
  await page.goto("/explorar/patrones");
  await page.getByTestId("pattern-filter-grosor").selectOption("worsted");
  await expect(page.getByTestId("patterns-count")).toHaveText("1 patrón");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: PATTERN_NAME }),
  ).toBeVisible();

  // Es el único con metraje cargado, así que el tramo avanzado lo encuentra.
  await page.getByTestId("pattern-more-filters").click();
  await page.getByTestId("pattern-filter-metraje").selectOption("hasta-400");
  await expect(page.getByTestId("patterns-count")).toHaveText("1 patrón");
  await expect(
    page.getByTestId("pattern-card").filter({ hasText: PATTERN_NAME }),
  ).toBeVisible();

  await visitor.close();
});
