import { expect, test, type Page } from "@playwright/test";

/**
 * Diario de avance y fotos, de punta a punta (spec §5.3): subir fotos
 * comprimidas a R2 (y verlas cargar desde la URL pública), elegir portada,
 * reordenar, guardar una entrada con foto, verlo todo sin sesión y borrar.
 * Usa su propia cuenta para no depender de otros tests.
 */

const NAME = "Prueba Fotos";
const EMAIL = "e2e.fotos@ovillo.test";
const USERNAME = "e2efotos";
const PASSWORD = "tejido-e2e-1234";
const PROJECT = "Bufanda e2e";
const SLUG = "bufanda-e2e";
const DIARY_TEXT = "Terminé la primera mitad de la bufanda.";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Email o @usuario").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/mi-tejido$/);
}

/**
 * Genera un JPEG sintético decente en el navegador del test: así no hace
 * falta guardar archivos de prueba en el repo y el flujo de compresión se
 * ejercita de verdad.
 */
async function makePhoto(page: Page, name: string) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("sin canvas");
    }
    const gradient = context.createLinearGradient(0, 0, 1200, 900);
    gradient.addColorStop(0, "#b45309");
    gradient.addColorStop(1, "#0f766e");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 900);
    context.fillStyle = "#ffffff";
    for (let i = 0; i < 300; i += 1) {
      context.fillRect(Math.random() * 1200, Math.random() * 900, 40, 8);
    }
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
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Espera a que las fotos de R2 carguen de verdad (naturalWidth > 0). */
async function expectLoadedPhotos(page: Page, testId: string, count: number) {
  await page.waitForFunction(
    ({ testId: id, count: expected }) => {
      const scope = document.querySelector(`[data-testid="${id}"]`);
      if (!scope) {
        return false;
      }
      const images = Array.from(
        scope.querySelectorAll<HTMLImageElement>('img[src*="r2.dev"]'),
      );
      return (
        images.filter((image) => image.complete && image.naturalWidth > 0)
          .length >= expected
      );
    },
    { testId, count },
    { timeout: 60_000 },
  );
}

test("registro rápido de la cuenta de fotos", async ({ page }) => {
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

test("preparo el proyecto para las fotos", async ({ page }) => {
  await signIn(page);

  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(PROJECT);
  await page.getByRole("button", { name: "Crear proyecto" }).click();

  await expect(page).toHaveURL(new RegExp(`/mi-tejido/proyectos/${SLUG}$`));
  await expect(page.getByTestId("project-gallery")).toBeVisible();
});

test("fotos: suben comprimidas, se ven desde R2 y la primera es portada", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);

  const gallery = page.getByTestId("project-gallery");
  const photoA = await makePhoto(page, "foto-a.jpg");
  const photoB = await makePhoto(page, "foto-b.jpg");
  await gallery
    .getByLabel("Sumar fotos al proyecto")
    .setInputFiles([photoA, photoB]);

  await expect(page.getByText("¡Listo! Sumamos las fotos.")).toBeVisible();
  await expectLoadedPhotos(page, "project-gallery", 2);
  await expect(gallery.getByText("2 / 20")).toBeVisible();

  // La primera foto queda como portada.
  await expect(gallery.getByRole("button", { name: "Ver foto" })).toHaveCount(
    2,
  );
  await expect(
    gallery.getByRole("button", { name: "Ver foto" }).first(),
  ).toContainText("Portada");
});

test("portada y orden: se eligen desde el visor", async ({ page }) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const gallery = page.getByTestId("project-gallery");

  // Cambio la portada a la segunda foto.
  await gallery.getByRole("button", { name: "Ver foto" }).nth(1).click();
  await page.getByRole("button", { name: "Usar como portada" }).click();
  await expect(
    page.getByText("Listo: esa es la portada del proyecto."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(
    gallery.getByRole("button", { name: "Ver foto" }).nth(1),
  ).toContainText("Portada");

  // Reordeno: la segunda pasa a ser la primera.
  const before = await gallery
    .locator('img[src*="r2.dev"]')
    .evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  await gallery.getByRole("button", { name: "Ver foto" }).nth(1).click();
  await page.getByRole("button", { name: "Mover antes" }).click();
  await expect(page.getByText("Cambiamos el orden.")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect
    .poll(async () =>
      gallery
        .locator('img[src*="r2.dev"]')
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("src")),
        ),
    )
    .toEqual([before[1], before[0]]);
});

test("diario: entrada con texto y foto", async ({ page }) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const diary = page.getByTestId("project-diary");

  await diary.getByRole("button", { name: "Nueva entrada" }).click();
  await diary.getByLabel("¿Cómo va?").fill(DIARY_TEXT);
  const photo = await makePhoto(page, "avance.jpg");
  await diary.getByLabel("Sumar fotos").setInputFiles(photo);
  await expect(diary.locator('img[src^="blob:"]')).toHaveCount(1);
  await diary.getByRole("button", { name: "Guardar entrada" }).click();

  await expect(page.getByText("¡Entrada guardada!")).toBeVisible();
  await expect(diary.getByText(DIARY_TEXT)).toBeVisible();
  await expectLoadedPhotos(page, "project-diary", 1);
});

test("diario: un archivo que no es foto se rechaza con un aviso", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const diary = page.getByTestId("project-diary");

  await diary.getByRole("button", { name: "Nueva entrada" }).click();
  await diary.getByLabel("¿Cómo va?").fill("Prueba con archivo raro");
  await diary.getByLabel("Sumar fotos").setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("esto no es una foto"),
  });
  await diary.getByRole("button", { name: "Guardar entrada" }).click();

  await expect(page.getByText("No pudimos leer esa foto.")).toBeVisible();
  await diary.getByRole("button", { name: "Cancelar" }).click();
  await expect(diary.getByText("Prueba con archivo raro")).toHaveCount(0);
});

test("público: galería, diario y Open Graph sin sesión", async ({
  browser,
  page,
}) => {
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/@${USERNAME}/proyectos/${SLUG}`);

  await expect(
    visitorPage.getByRole("heading", { name: PROJECT }),
  ).toBeVisible();
  await expectLoadedPhotos(visitorPage, "project-media-public", 2);
  await expect(visitorPage.getByText(DIARY_TEXT)).toBeVisible();

  // La foto de portada se comparte en Open Graph.
  const ogImage = visitorPage.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveAttribute("content", /r2\.dev/);

  await visitor.close();
  await signIn(page);
});

test("borrar: la foto se va de la galería y la de portada se reubica", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const gallery = page.getByTestId("project-gallery");

  await gallery.getByRole("button", { name: "Ver foto" }).first().click();
  await page.getByRole("button", { name: "Eliminar foto" }).click();
  await page
    .getByTestId("photo-viewer")
    .getByRole("button", { name: "Sí, eliminar" })
    .click();

  await expect(page.getByText("Foto eliminada.")).toBeVisible();
  await expect(gallery.getByText("1 / 20")).toBeVisible();
  await expect(gallery.getByRole("button", { name: "Ver foto" })).toHaveCount(
    1,
  );
  await expect(
    gallery.getByRole("button", { name: "Ver foto" }).first(),
  ).toContainText("Portada");
});

test("borrar: la entrada del diario se va completa", async ({ page }) => {
  await signIn(page);
  await page.goto(`/mi-tejido/proyectos/${SLUG}`);
  const diary = page.getByTestId("project-diary");

  await diary.getByRole("button", { name: "Eliminar entrada" }).click();
  await diary.getByRole("button", { name: "Sí, eliminar" }).click();

  await expect(page.getByText("Entrada eliminada.")).toBeVisible();
  await expect(diary.getByText(DIARY_TEXT)).toHaveCount(0);
});
