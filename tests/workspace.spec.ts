import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function capture(page: Page, title: string, body: string, tags = "") {
  await page.getByRole("button", { name: "Capturar", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Título" })).toBeFocused();
  await page.getByRole("textbox", { name: "Título" }).fill(title);
  await page.getByRole("textbox", { name: "Contenido" }).fill(body);
  await page.getByRole("textbox", { name: "Etiquetas" }).fill(tags);
}

test("captures, links, finds and opens persisted knowledge", async ({ page }) => {
  await page.goto("/");
  await capture(page, "Proyecto Geología", "Estudio del manto", "ciencia");
  await page.getByRole("combobox", { name: "Tipo de elemento" }).selectOption("project");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await capture(page, "Corteza oceánica", "**Densa** y delgada", "ciencia");
  await page.getByRole("combobox", { name: "Tipo de conexión" }).selectOption("belongs");
  await page.getByRole("combobox", { name: "Conectar con" }).selectOption({ label: "Proyecto Geología" });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();

  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar en la biblioteca" }).fill("oceanica");
  await expect(page.getByText("1 elementos")).toBeVisible();
  await page.getByRole("button", { name: /Corteza oceánica/ }).click();
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByText("Densa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  await page.getByRole("button", { name: "Grafo", exact: true }).click();
  await expect(page.getByText("2 / 2 nodos · 1 conexiones visibles")).toBeVisible();
  await page.getByRole("button", { name: "Corteza oceánica", exact: true }).click();
  await expect(page.getByRole("button", { name: /Pertenece a · Proyecto Geología/ })).toBeVisible();
  await page.getByRole("button", { name: "Abrir original" }).click();
  await expect(page.getByRole("textbox", { name: "Contenido" })).toHaveValue("**Densa** y delgada");
});

test("restores a validated backup and checks the home page for accessibility and overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Capturar", exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  const at = "2026-01-01T00:00:00.000Z";
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, relations: [],
      entries: [{ id: "abc010a3-98ce-476c-91dc-05c9da2ac849", title: "Nota restaurada", kind: "note", body: "Contenido", url: "", tags: [], pinned: false, createdAt: at, updatedAt: at, history: [] }] }))
  });
  await expect(page.getByText("Copia importada.")).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /Nota restaurada/ })).toBeVisible();
});

test("keeps appearance and language preferences across reloads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.getByLabel("Tema").selectOption("dark");
  await page.getByLabel("Reducir transparencia").check();
  await page.getByLabel("Idioma").selectOption("en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-solid", "true");
});
