import { test, expect } from "@playwright/test";
import { BARCODES, open, tab, scan, row, addProduct } from "./helpers.js";

// Naming convention: "TC-xx [REQ] description". Tags: @smoke runs on every push,
// @defect marks tests that assert REQUIRED behaviour the prototype does not yet meet
// (they are expected to fail until the linked defect is fixed), @quality marks
// non-functional checks.

test.describe("Functional - FR-02 barcode scan", () => {
  test("TC-01 [FR-02] valid scan decrements stock and logs the scan @smoke", async ({ page }) => {
    await open(page);
    await scan(page, BARCODES.basmati);
    await expect(page.getByText("Basmati Rice 5kg — 41 bags left")).toBeVisible();
    await tab(page, "Catalogue");
    await expect(row(page, "Basmati Rice 5kg")).toContainText("41 bags");
  });

  test("TC-02 [FR-02] unregistered barcode changes nothing (negative)", async ({ page }) => {
    await open(page);
    await scan(page, "0000000000000");
    await expect(page.getByText("Not found: 0000000000000")).toBeVisible();
    await tab(page, "Catalogue");
    await expect(row(page, "Basmati Rice 5kg")).toContainText("42 bags");
    await expect(row(page, "Soy Sauce 1L")).toContainText("27 bottles");
  });

  test("TC-03 [FR-02] pressing Enter submits a scan (scanner emulation)", async ({ page }) => {
    await open(page);
    await page.getByPlaceholder("Barcode").fill(BARCODES.soy);
    await page.getByPlaceholder("Barcode").press("Enter");
    await expect(page.getByText("Soy Sauce 1L — 26 bottles left")).toBeVisible();
    await expect(page.getByPlaceholder("Barcode")).toHaveValue("");
  });

  test("TC-04 [FR-02] empty / whitespace-only scan is ignored (invalid input)", async ({ page }) => {
    await open(page);
    await scan(page, "   ");
    await expect(page.getByText("No scans yet.")).toBeVisible();
  });

  test("TC-05 [FR-02] stock never goes below zero (boundary)", async ({ page }) => {
    await open(page);
    for (let i = 0; i < 5; i++) await scan(page, BARCODES.shiitake); // starts at 3
    await tab(page, "Catalogue");
    await expect(row(page, "Dried Shiitake 100g")).toContainText("0 bags");
  });

  test("TC-06 [FR-02] scanning an out-of-stock item warns the cashier @defect", async ({ page }) => {
    await open(page);
    for (let i = 0; i < 4; i++) await scan(page, BARCODES.shiitake); // 3 -> 0, 4th is an oversell
    await expect(page.getByText(/out of stock/i)).toBeVisible();
  });
});

test.describe("Functional - FR-03 notifications", () => {
  test("TC-07 [FR-03] items at/below reorder threshold are listed on load", async ({ page }) => {
    await open(page);
    await expect(page.getByText(/Low stock:\s*Coconut Milk 400ml/)).toBeVisible();
    await expect(page.getByText(/Low stock:\s*Dried Shiitake 100g/)).toBeVisible();
    await expect(page.getByText(/Low stock:\s*Basmati/)).toHaveCount(0);
  });

  test("TC-08 [FR-03] alert appears exactly when stock reaches the threshold (boundary)", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Test Item", stock: 6, reorder: 5, expiry: "01/01/2028" });
    await expect(page.getByText(/Low stock:\s*Test Item/)).toHaveCount(0); // 6 > 5
    await row(page, "Test Item").getByRole("button", { name: "-1" }).click(); // 5 == threshold
    await expect(page.getByText(/Low stock:\s*Test Item/)).toBeVisible();
  });

  test("TC-09 [FR-03] product within 3 days of expiry raises an expiry alert", async ({ page }) => {
    await open(page);
    await expect(page.getByText(/Expiry alert:\s*Fresh Tofu 300g in 3d/)).toBeVisible();
  });

  test("TC-10 [FR-03] a low-stock item that is also near expiry shows an expiry alert @defect", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0007", name: "Fragile Item", stock: 1, reorder: 5, expiry: "31/08/2026" });
    await expect(page.getByText(/Expiry alert:\s*Fragile Item/)).toBeVisible();
  });

  test("TC-11 [FR-03] expiry is calculated from the current date, not a fixed date @defect", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-20T00:00:00Z") });
    await open(page);
    // Fresh Tofu expired on 02/09/2026; it must not be reported as 'in 3d'.
    await expect(page.getByText(/Fresh Tofu 300g in 3d/)).toHaveCount(0);
  });
});

test.describe("Functional - FR-01 / FR-04 product creation", () => {
  test("TC-12 [FR-04] code matching the template is accepted", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Jasmine Rice 1kg", stock: 10, reorder: 3, expiry: "01/06/2028" });
    await expect(page.getByText("Products (6)")).toBeVisible();
    await expect(row(page, "Jasmine Rice 1kg")).toContainText("10 units");
  });

  test("TC-13 [FR-04] code breaking the template is rejected (negative)", async ({ page }) => {
    await open(page);
    for (const bad of ["GRC-6", "GR-0006", "GRCD-0006", "GRC0006", "GRC-00066"]) {
      await addProduct(page, { code: bad, name: `Bad ${bad}`, stock: 1, reorder: 1, expiry: "01/01/2028" });
      await expect(page.getByText(/FR-04: code must match template/)).toBeVisible();
    }
    await expect(page.getByText("Products (5)")).toBeVisible();
  });

  test("TC-14 [FR-04] admin-edited template is applied to new codes", async ({ page }) => {
    await open(page, "admin");
    await tab(page, "Admin");
    await page.locator("input").first().fill("^[A-Z]{2}\\d{3}$");
    await addProduct(page, { code: "AB123", name: "Template Item", stock: 1, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText("Products (6)")).toBeVisible();
  });

  test("TC-15 [FR-01] duplicate product code is rejected outright", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0004", name: "Something New", stock: 1, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText(/a product with code "GRC-0004" already exists/)).toBeVisible();
    await expect(page.getByText("Products (5)")).toBeVisible();
  });

  test("TC-16 [FR-01] duplicate code check is case-insensitive", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "grc-0004", name: "Something New", stock: 1, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText(/already exists/)).toBeVisible();
  });

  test("TC-17 [FR-01] similar (not identical) name is flagged for review but not blocked @defect", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Basmati Rice 5 kg", stock: 4, reorder: 2, expiry: "01/01/2028" });
    await expect(page.getByText("Products (6)")).toBeVisible(); // not blocked
    await expect(page.getByText(/similar/i)).toBeVisible(); // flagged
  });

  test("TC-18 [FR-01] missing code or name is rejected (invalid input)", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "", name: "", stock: 1, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText(/product code and name are required/)).toBeVisible();
  });

  test("TC-19 [FR-01] negative starting stock is rejected (boundary) @defect", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Negative Item", stock: -5, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText("Products (5)")).toBeVisible();
  });

  test("TC-20 [FR-01] unparseable expiry date is rejected, not silently replaced @defect", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Bad Date Item", stock: 1, reorder: 1, expiry: "not-a-date" });
    await expect(page.getByText("Products (5)")).toBeVisible();
  });

  test("TC-21 [FR-04] invalid regex in admin template does not crash the form @defect", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, "admin");
    await tab(page, "Admin");
    await page.locator("input").first().fill("[");
    await addProduct(page, { code: "GRC-0006", name: "Regex Item", stock: 1, reorder: 1, expiry: "01/01/2028" });
    expect(errors).toEqual([]);
  });
});

test.describe("Functional - FR-05 / FR-06 / FR-07 catalogue", () => {
  test("TC-22 [FR-05] '+1 case' restocks by the pack size (1 case = 6 bags)", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await row(page, "Basmati Rice 5kg").getByRole("button", { name: "+1 case" }).click();
    await expect(row(page, "Basmati Rice 5kg")).toContainText("48 bags");
  });

  test("TC-23 [FR-05] user can restock a chosen number of packs (2 boxes x 24 = 48) @defect", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await expect(row(page, "Coconut Milk 400ml").getByRole("spinbutton")).toHaveCount(1);
  });

  test("TC-24 [FR-06] search by name is case-insensitive", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await page.getByPlaceholder(/Search by name or code/).fill("TOFU");
    await expect(row(page, "Fresh Tofu 300g")).toBeVisible();
    await expect(row(page, "Basmati Rice 5kg")).toHaveCount(0);
  });

  test("TC-25 [FR-06] search by product code", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await page.getByPlaceholder(/Search by name or code/).fill("grc-0005");
    await expect(row(page, "Soy Sauce 1L")).toBeVisible();
    await expect(row(page, "Fresh Tofu 300g")).toHaveCount(0);
  });

  test("TC-26 [FR-06] search with no match shows an empty state (negative)", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await page.getByPlaceholder(/Search by name or code/).fill("zzzz");
    await expect(page.getByText("No products found.")).toBeVisible();
  });

  test("TC-27 [FR-07] manual -1 adjustment decrements, floors at zero (boundary)", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    const r = row(page, "Dried Shiitake 100g");
    for (let i = 0; i < 4; i++) await r.getByRole("button", { name: "-1" }).click(); // 3 -> 0, stays 0
    await expect(r).toContainText("0 bags");
  });

  test("TC-28 [FR-07] a reason must be recorded for a manual adjustment @defect", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await row(page, "Basmati Rice 5kg").getByRole("button", { name: "-1" }).click();
    await expect(page.getByPlaceholder(/reason/i).or(page.getByLabel(/reason/i))).toBeVisible();
  });
});

test.describe("Non-functional - security, access, audit, persistence", () => {
  test("TC-29 [NFR-04] cashier sees 'Access restricted' on the Admin tab @smoke", async ({ page }) => {
    await open(page);
    await tab(page, "Admin");
    await expect(page.getByText("Access restricted")).toBeVisible();
    await expect(page.getByText(/Stocktake - all products/i)).toHaveCount(0);
  });

  test("TC-30 [NFR-04] admin sees the template editor and stocktake", async ({ page }) => {
    await open(page, "admin");
    await tab(page, "Admin");
    await expect(page.getByText(/Product code template/)).toBeVisible();
    await expect(page.getByText(/Stocktake/)).toBeVisible();
  });

  test("TC-31 [NFR-04] a cashier cannot grant themselves the admin role @defect @security", async ({ page }) => {
    await open(page);
    const options = await page.locator("select option").allTextContents();
    expect(options.map((o) => o.toLowerCase())).not.toContain("admin");
  });

  test("TC-32 [NFR-04] product names are rendered as text, not HTML (XSS) @security", async ({ page }) => {
    await open(page);
    const payload = "<img src=x onerror=window.__xss=1>";
    await addProduct(page, { code: "GRC-0006", name: payload, stock: 1, reorder: 1, expiry: "01/01/2028" });
    await expect(page.getByText(payload, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test("TC-33 [NFR-02] each stock-affecting action is logged with user and timestamp @defect", async ({ page }) => {
    await open(page);
    await scan(page, BARCODES.basmati);
    await expect(page.getByText(/cashier/i).filter({ hasText: "Basmati" })).toBeVisible();
  });

  test("TC-34 [NFR-01] data survives a page reload @defect", async ({ page }) => {
    await open(page);
    await addProduct(page, { code: "GRC-0006", name: "Persist Item", stock: 1, reorder: 1, expiry: "01/01/2028" });
    await page.reload();
    await tab(page, "Catalogue");
    await expect(page.getByText("Persist Item")).toBeVisible();
  });

  test.skip("TC-35 [NFR-06] two scanners scanning simultaneously (BLOCKED: needs shared backend)", async () => {});
  test.skip("TC-36 [NFR-01] scheduled backup and recovery after reboot (BLOCKED: needs database)", async () => {});
});

test.describe("Quality - performance, usability, accessibility", () => {
  test("TC-37 [NFR-05] 95% of scans reflect on screen within 3 s @quality", async ({ page }) => {
    await open(page);
    const times = [];
    for (let i = 0; i < 25; i++) {
      const t0 = Date.now();
      await page.getByRole("button", { name: /Soy Sauce 1L/ }).click();
      await expect(page.getByText(`Soy Sauce 1L — ${26 - i} bottles left`)).toBeVisible();
      times.push(Date.now() - t0);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(times.length * 0.95) - 1];
    test.info().annotations.push({ type: "p95_ms", description: String(p95) });
    expect(p95).toBeLessThan(3000);
  });

  test("TC-38 [NFR-05] 48 consecutive scans leave a consistent total @quality", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await row(page, "Basmati Rice 5kg").getByRole("button", { name: "+1 case" }).click(); // 48
    await tab(page, "Checkout");
    const btn = page.getByRole("button", { name: /Basmati Rice 5kg/ });
    for (let i = 0; i < 48; i++) await btn.click();
    await tab(page, "Catalogue");
    await expect(row(page, "Basmati Rice 5kg")).toContainText("0 bags");
  });

  test("TC-39 [NFR-03] primary workflow is reachable by keyboard only @quality", async ({ page }) => {
    await open(page);
    await page.getByPlaceholder("Barcode").focus();
    await page.keyboard.type(BARCODES.tofu);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Fresh Tofu 300g — 14 packs left")).toBeVisible();
  });

  test("TC-40 [NFR-03] form inputs have accessible labels, not placeholders only @defect @accessibility", async ({ page }) => {
    await open(page);
    await tab(page, "Catalogue");
    await page.getByRole("button", { name: "Add product" }).click();
    await expect(page.getByLabel(/product name/i)).toHaveCount(1);
  });

  test("TC-41 [NFR-03] status is not conveyed by colour alone (text 'Low stock' present) @accessibility", async ({ page }) => {
    await open(page);
    await expect(page.getByText(/Low stock:/).first()).toBeVisible();
  });

  test("TC-42 [NFR-03] layout remains usable at mobile width (no horizontal overflow) @quality", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
