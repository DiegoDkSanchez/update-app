import { test, expect } from "@playwright/test";
test("login and responsive dashboard render without overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Te damos la bienvenida a Update." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.screenshot({
    path: `test-results/login-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator(".login-photo")).toHaveCSS("background-image", "none");
  await expect(page.locator(".login-photo")).toHaveCSS("background-color", "rgb(40, 101, 77)");
  await page.getByRole("button", { name: "Explorar un grupo de ejemplo" }).click();
  await expect(
    page.getByRole("heading", { name: "Cena del viernes" }),
  ).toBeVisible();
  await expect(page.locator(".item-row")).toHaveCount(4);
  await expect(page.locator(".group-cover img")).toHaveCount(0);
  await expect(page.locator(".group-cover")).toHaveCSS("background-image", "none");
  await expect(page.locator(".group-cover")).toHaveCSS("background-color", "rgb(40, 101, 77)");
  await expect(page.locator(".stats")).toContainText("$96.50");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("create, edit, complete, filter, delete, and reload a purchase", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await page
    .locator('.page-heading')
    .getByRole("button", { name: "Crear grupo", exact: true })
    .click();
  await page.getByLabel("Nombre del grupo").fill("Birthday dinner");
  await page.getByLabel("Descripción").fill("Bring something to share.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear grupo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Birthday dinner" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Agregar pago", exact: true }).click();
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("A very long participant name that should wrap on mobile");
  await page
    .getByLabel("¿Qué va a pagar?")
    .fill("Fresh pasta, homemade sourdough and seasonal vegetables");
  await page.getByLabel("Monto (USD)").fill("31.25");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Agregar pago", exact: true })
    .click();
  await expect(page.locator(".item-row")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: /Marcar como pagado/ }).click();
  await expect(page.locator(".item-status")).toHaveText("Pagado");
  await page.getByRole("button", { name: "Por pagar 0", exact: true }).click();
  await expect(page.locator(".item-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByTitle(/Editar Fresh pasta/).click();
  await page.getByLabel("Monto (USD)").fill("40");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page.reload();
  await expect(page.locator(".amount-cell")).toHaveText("$40.00");
  await page.getByRole("button", { name: "Compartir grupo" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "se guarda solo en tu navegador",
  );
  await page.keyboard.press("Escape");
  await page.getByTitle(/Eliminar Fresh pasta/).click();
  await page.getByRole("button", { name: "Eliminar pago", exact: true }).click();
  await expect(page.locator(".item-row")).toHaveCount(0);
});
