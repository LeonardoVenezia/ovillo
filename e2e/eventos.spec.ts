import { expect, test, type Page } from "@playwright/test";

/**
 * KAL/CAL de punta a punta (spec §5.10, tramo 3): una cuenta crea un grupo y
 * arma un KAL con patrón y etapas, sin sesión se invita a ingresar, otra
 * cuenta se suma al grupo y participa con su proyecto, la primera se suma,
 * cambia de proyecto, sale y edita el evento (el hilo propio se actualiza).
 * Usa sus propias cuentas para no depender de otros tests.
 */

const NAME_A = "Prueba Eventos A";
const EMAIL_A = "e2e.eventos@ovillo.test";
const USERNAME_A = "e2eeventos";
const NAME_B = "Prueba Eventos B";
const EMAIL_B = "e2e.eventos2@ovillo.test";
const USERNAME_B = "e2eeventos2";
const PASSWORD = "tejido-e2e-1234";

const GROUP = "Eventos e2e";
const GROUP_SLUG = "eventos-e2e";
const EVENT = "KAL Muestra e2e";
const EVENT_EDITED = "KAL Muestra e2e (editado)";
const DESCRIPTION = "Tejemos juntas una prenda guiándonos con el patrón.";
const STAGE_TITLE = "Montar y muestra";
const PROJECT_A = "Sweater e2e";
const PROJECT_A_TWO = "Chal e2e";
const PROJECT_B = "Bufanda e2e";
const REPLY_B = "¡Me sumo! Voy con las mangas esta semana.";
const EVENT_PATTERN = "Cardigan Dreams";
const EVENT_PATTERN_SLUG = "cardigan-dreams";

test.describe.configure({ mode: "serial" });

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

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

async function createProject(page: Page, name: string) {
  await page.goto("/mi-tejido/proyectos/nuevo");
  await page.getByLabel("Nombre").fill(name);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page).toHaveURL(/\/mi-tejido\/proyectos\/[a-z0-9-]+$/);
}

async function openEvent(page: Page) {
  await page.goto(`/grupos/${GROUP_SLUG}/eventos`);
  await page.getByTestId("event-card").filter({ hasText: EVENT }).click();
  await expect(page.getByTestId("event-view")).toBeVisible();
}

test("A crea el grupo y arma un KAL con patrón y etapas", async ({ page }) => {
  await register(page, NAME_A, USERNAME_A, EMAIL_A);

  await page.goto("/grupos/nuevo");
  await page.getByTestId("group-name-input").fill(GROUP);
  await page
    .getByTestId("group-description-input")
    .fill("Para probar los KAL/CAL de punta a punta.");
  await page.getByTestId("group-submit").click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${GROUP_SLUG}$`));

  // La ficha, sin eventos, invita a armar el primero.
  await expect(
    page.getByTestId("group-events").getByText("Todavía no hay KAL/CAL"),
  ).toBeVisible();
  await page.getByTestId("new-event").click();
  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/eventos/nuevo$`),
  );

  // Empieza ayer y termina en 30 días: siempre "en curso" para el test.
  await page.getByTestId("event-name-input").fill(EVENT);
  await page.getByTestId("event-start-input").fill(isoDaysFromNow(-1));
  await page.getByTestId("event-end-input").fill(isoDaysFromNow(30));
  await page.getByTestId("event-description-input").fill(DESCRIPTION);

  // Un patrón de la biblioteca: se filtra y se elige.
  await page.getByTestId("event-pattern-filter").fill("Cardigan");
  await page.getByTestId(`event-pattern-${EVENT_PATTERN_SLUG}`).check();

  // Una etapa opcional.
  await page.getByTestId("event-stage-add").click();
  await page.getByTestId("event-stage-title").fill(STAGE_TITLE);

  await page.getByTestId("event-submit").click();

  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/eventos/[a-z0-9]+$`),
  );
  await expect(page.getByText("¡KAL/CAL creado!")).toBeVisible();
  await expect(page.getByRole("heading", { name: EVENT })).toBeVisible();
  await expect(page.getByText("KAL", { exact: true })).toBeVisible();
  await expect(page.getByTestId("event-status")).toHaveText("En curso");
  await expect(page.getByTestId("event-pattern")).toContainText(EVENT_PATTERN);
  await expect(page.getByTestId("event-stage")).toContainText(STAGE_TITLE);
  await expect(page.getByTestId("event-participants-empty")).toBeVisible();

  // La ficha del grupo y el hub de comunidad lo muestran.
  await page.goto(`/grupos/${GROUP_SLUG}`);
  await expect(
    page.getByTestId("group-events").getByTestId("event-card"),
  ).toContainText(EVENT);
  await page.goto("/comunidad");
  await expect(page.getByTestId("active-events")).toContainText(EVENT);
});

test("sin sesión invita a ingresar; B se une, participa y responde", async ({
  page,
}) => {
  // Sin sesión se ve el KAL, pero sumarse pide ingresar.
  await openEvent(page);
  const eventUrl = page.url();
  await expect(page.getByTestId("event-sign-in")).toBeVisible();
  await expect(page.getByTestId("event-join-submit")).toHaveCount(0);

  // B llega sin ser parte: se le ofrece unirse al grupo.
  await register(page, NAME_B, USERNAME_B, EMAIL_B);
  await page.goto(eventUrl);
  await expect(page.getByText("Para sumarte, unite al grupo.")).toBeVisible();
  await expect(page.getByTestId("event-join-select")).toHaveCount(0);

  await page.getByTestId("event-go-group").click();
  await expect(page).toHaveURL(new RegExp(`/grupos/${GROUP_SLUG}$`));
  // Como integrante (no moderadora) no ve el botón de armar KAL/CAL.
  await expect(page.getByTestId("new-event")).toHaveCount(0);
  await page.getByTestId("group-join-button").click();
  await expect(page.getByText("¡Listo! Ya sos parte del grupo.")).toBeVisible();

  // Ya es parte: sin proyectos, se la invita a crear uno.
  await page.goto(eventUrl);
  await expect(
    page.getByText("Primero creá un proyecto y volvé para sumarte."),
  ).toBeVisible();
  await createProject(page, PROJECT_B);

  // Se suma con su proyecto y responde en el hilo del evento.
  await page.goto(eventUrl);
  await page.getByTestId("event-join-select").selectOption(PROJECT_B);
  await page.getByTestId("event-join-submit").click();
  await expect(
    page.getByText("¡Listo! Ya sos parte del KAL/CAL."),
  ).toBeVisible();
  await expect(page.getByTestId("event-my-project")).toHaveText(PROJECT_B);
  await expect(page.getByTestId("event-participant")).toHaveCount(1);

  await page.getByTestId("reply-body-input").fill(REPLY_B);
  await page.getByTestId("reply-submit").click();
  await expect(page.getByText("¡Publicada!")).toBeVisible();
  await expect(
    page.getByTestId("event-post").filter({ hasText: REPLY_B }),
  ).toBeVisible();
});

test("A se suma, cambia de proyecto, sale y edita el KAL", async ({ page }) => {
  await signIn(page, EMAIL_A);
  await createProject(page, PROJECT_A);

  await openEvent(page);
  await page.getByTestId("event-join-select").selectOption(PROJECT_A);
  await page.getByTestId("event-join-submit").click();
  await expect(page.getByTestId("event-my-project")).toHaveText(PROJECT_A);
  await expect(page.getByTestId("event-participant")).toHaveCount(2);

  // Cambia de proyecto: crea otro y lo elige.
  await createProject(page, PROJECT_A_TWO);
  await openEvent(page);
  await page.getByTestId("event-change-project").click();
  await page.getByTestId("event-join-select").selectOption(PROJECT_A_TWO);
  await page.getByTestId("event-join-submit").click();
  await expect(page.getByText("Listo, cambiamos tu proyecto.")).toBeVisible();
  await expect(page.getByTestId("event-my-project")).toHaveText(PROJECT_A_TWO);

  // Responde como organizadora.
  await page
    .getByTestId("reply-body-input")
    .fill("¡Bienvenida! Cualquier duda me escriben.");
  await page.getByTestId("reply-submit").click();
  await expect(page.getByTestId("event-post")).toHaveCount(2);

  // Se sale: el formulario para sumarse vuelve.
  await page.getByTestId("event-leave-button").click();
  await expect(page.getByText("Saliste del KAL/CAL.")).toBeVisible();
  await expect(page.getByTestId("event-participant")).toHaveCount(1);
  await expect(page.getByTestId("event-join-select")).toBeVisible();

  // Edita el KAL: cambia el nombre y el hilo propio queda sincronizado.
  await page.getByTestId("event-edit").click();
  await expect(page).toHaveURL(
    new RegExp(`/grupos/${GROUP_SLUG}/eventos/[a-z0-9]+/editar$`),
  );
  await page.getByTestId("event-name-input").fill(EVENT_EDITED);
  await page.getByTestId("event-submit").click();
  await expect(page.getByText("Listo, guardamos los cambios.")).toBeVisible();
  await expect(page.getByRole("heading", { name: EVENT_EDITED })).toBeVisible();

  await page.goto(`/grupos/${GROUP_SLUG}/hilos`);
  await expect(
    page.getByTestId("thread-card").filter({ hasText: EVENT_EDITED }),
  ).toBeVisible();
});

test("el KAL que no existe da 404", async ({ page }) => {
  const response = await page.goto(
    `/grupos/${GROUP_SLUG}/eventos/no-existe-e2e`,
  );
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Acá no hay nada tejido todavía")).toBeVisible();
});
