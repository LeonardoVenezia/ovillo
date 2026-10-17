import { expect, test } from "@playwright/test";

/**
 * Comprobaciones públicas que no tocan la base ni la sesión (spec §5.2):
 * los perfiles inexistentes dan un 404 de verdad y las páginas privadas
 * piden ingresar.
 */

test("un @usuario que no existe da 404", async ({ page }) => {
  const response = await page.goto("/@ovillonoexiste");

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});

test("las páginas privadas piden ingresar", async ({ page }) => {
  await page.goto("/mi-tejido");

  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fmi-tejido/);
});
