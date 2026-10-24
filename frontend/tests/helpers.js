import { expect } from "@playwright/test";

export const BARCODES = {
  basmati: "8901030875021",
  coconut: "8850124301029",
  tofu: "8992772100118",
  shiitake: "8710398512207",
  soy: "8801043019284",
};

export async function open(page, role = "cashier") {
  await page.goto("/");
  await expect(page.getByText("Inventory Prototype")).toBeVisible();
  if (role !== "cashier") await page.locator("select").selectOption(role);
}

export const tab = (page, name) => page.getByRole("button", { name, exact: true }).click();

export const scan = async (page, barcode) => {
  await page.getByPlaceholder("Barcode").fill(barcode);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
};

// A catalogue/admin table row, found by product name or code.
export const row = (page, text) =>
  page.locator('div[style*="grid-template-columns"]').filter({ hasText: text }).first();

export async function addProduct(page, { code = "", name = "", stock = "", reorder = "", expiry = "" }) {
  await tab(page, "Catalogue");
  const addBtn = page.getByRole("button", { name: "Add product" });
  if (await addBtn.isVisible()) await addBtn.click();
  await page.getByPlaceholder(/Product code/).fill(code);
  await page.getByPlaceholder("Product name").fill(name);
  await page.getByPlaceholder("Starting stock").fill(String(stock));
  await page.getByPlaceholder("Reorder threshold").fill(String(reorder));
  await page.getByPlaceholder(/Expiry date/).fill(expiry);
  await page.getByRole("button", { name: "Save product" }).click();
}

export const sidebar = (page) => page.locator("div").filter({ hasText: /^Notifications/ }).last();
