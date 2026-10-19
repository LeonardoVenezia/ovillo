import { expect, test } from "@playwright/test";

/**
 * Glosario de punta a punta (spec §5.14, tramo 3): es público, se lee sin
 * sesión, la búsqueda entiende sinónimos (variantes de país, abreviaturas y
 * el nombre en inglés) y los filtros por técnica achican la lista.
 */

test("el glosario se lee sin sesión y busca por variante y abreviatura", async ({
  page,
}) => {
  await page.goto("/glosario");
  await expect(
    page.getByRole("heading", { name: "Glosario", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("glossary-count")).toContainText("términos");
  await expect(
    page.getByTestId("glossary-section-punto").getByTestId("glossary-term"),
  ).not.toHaveCount(0);

  // "liso" es la variante española de Punto jersey.
  await page.getByTestId("glossary-search").fill("liso");
  await page.getByTestId("glossary-search-submit").click();
  await expect(page.getByTestId("glossary-count")).toHaveText("1 término");
  const jersey = page
    .getByTestId("glossary-term")
    .filter({ hasText: "Punto jersey" });
  await expect(jersey).toBeVisible();
  await expect(jersey).toContainText("En España: punto liso");
  await expect(jersey).toContainText("stockinette stitch");

  // La abreviatura de los patrones también encuentra el término.
  await page.getByTestId("glossary-search").fill("2 pj");
  await page.getByTestId("glossary-search-submit").click();
  const decrease = page
    .getByTestId("glossary-term")
    .filter({ hasText: "Dos puntos juntos" });
  await expect(decrease).toBeVisible();
  await expect(decrease.getByTestId("glossary-abbreviation")).toContainText(
    "2 pj",
  );
});

test("los filtros por técnica y el vacío se comportan", async ({ page }) => {
  await page.goto("/glosario");

  // Con Crochet, un término de dos agujas no aparece y uno de crochet sí.
  await page.getByTestId("glossary-filter-crochet").click();
  await expect(page).toHaveURL(/tecnica=crochet/);
  await expect(
    page.getByTestId("glossary-term").filter({ hasText: "Punto jersey" }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("glossary-term").filter({ hasText: "Cadena" }),
  ).toBeVisible();

  // Volver a "Todo" y buscar algo que no existe.
  await page.getByTestId("glossary-filter-todas").click();
  await page.getByTestId("glossary-search").fill("bufanda voladora");
  await page.getByTestId("glossary-search-submit").click();
  await expect(page.getByText("No encontramos ese término")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ir a la comunidad" }),
  ).toBeVisible();
});
