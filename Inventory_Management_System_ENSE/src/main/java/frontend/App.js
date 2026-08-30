import React, { useState } from "react";
import "./styles.css";

// Shared palette to keep the black/white layout with colour accents.
const c = {
  bg: "#FFFFFF",
  text: "#000000",
  muted: "#666666",
  line: "#000000",
  faint: "#DDDDDD",
  good: "#1A7A32",
  low: "#C22626",
  teal: "#1F4B45",
};

// Main tab navigation.
const tabs = [
  { id: "checkout", label: "Checkout" },
  { id: "catalogue", label: "Catalogue" },
  { id: "admin", label: "Admin" },
];

// Mock inventory used to populate the prototype.
const seedProducts = [
  { id: "GRC-0001", name: "Basmati Rice 5kg", barcode: "8901030875021", stock: 42, unit: "bag", reorder: 10, packLabel: "case", packQty: 6, expiry: "2026-12-01" },
  { id: "GRC-0002", name: "Coconut Milk 400ml", barcode: "8850124301029", stock: 8, unit: "can", reorder: 12, packLabel: "box", packQty: 24, expiry: "2026-09-04" },
  { id: "GRC-0003", name: "Fresh Tofu 300g", barcode: "8992772100118", stock: 15, unit: "pack", reorder: 6, packLabel: "tray", packQty: 8, expiry: "2026-09-02" },
  { id: "GRC-0004", name: "Dried Shiitake 100g", barcode: "8710398512207", stock: 3, unit: "bag", reorder: 5, packLabel: "carton", packQty: 10, expiry: "2027-03-15" },
  { id: "GRC-0005", name: "Soy Sauce 1L", barcode: "8801043019284", stock: 27, unit: "bottle", reorder: 8, packLabel: "case", packQty: 12, expiry: "2027-01-20" },
];

// Validation rules for product codes in the admin panel and catalogue form.
const DEFAULT_TEMPLATE = "^[A-Z]{3}-\\d{4}$";
const TEMPLATE_HINT = "AAA-0000 (e.g. GRC-0006)";
const today = new Date("2026-08-30");

// Shared product helpers used across tabs for stock and expiry checks.
const isLowStock = (p) => p.stock <= p.reorder;
const daysUntil = (dateStr) => {
  const d = new Date(dateStr);
  return Math.round((d - today) / 86400000);
};
const isExpiringSoon = (p) => daysUntil(p.expiry) <= 3;

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseDMY = (value) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

// Update a single product in the array without mutating the original list.
const updateProductStock = (products, productId, nextStock) =>
  products.map((product) => (product.id === productId ? { ...product, stock: nextStock } : product));

// Reusable UI labels and shared button/input styles used across tabs.
const Label = ({ children, fr }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
    {children}
    {fr ? ` – ${fr}` : ""}
  </div>
);

const btn = {
  background: c.teal,
  color: c.bg,
  border: `1px solid ${c.teal}`,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const row = { border: `1px solid ${c.line}`, padding: "8px 10px" };
const inputStyle = { padding: "8px 10px", border: `1px solid ${c.line}`, fontSize: 13 };

const styles = {
  app: { padding: 24, maxWidth: 960, margin: "0 auto", fontFamily: "system-ui, sans-serif", color: c.text, background: c.bg },
  shell: { border: `1px solid ${c.line}` },
  header: { padding: "16px 20px", borderBottom: `1px solid ${c.line}`, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" },
  headerRight: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 },
  select: {
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 8px",
    border: `1px solid ${c.line}`,
    background: c.bg,
    color: c.text,
    cursor: "pointer",
  },
  tabGroup: { display: "flex", gap: 2 },
  tabButton: (active) => ({
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? c.teal : c.bg,
    color: active ? c.bg : c.text,
    border: `1px solid ${active ? c.teal : c.line}`,
  }),
  content: { padding: 20, display: "flex", flexWrap: "wrap", gap: 20 },
  mainColumn: { flex: 1, minWidth: 280 },
  sidebar: { width: 200, flexShrink: 0 },
  sidebarBox: { border: `1px solid ${c.low}`, padding: "8px 10px", fontSize: 12 },
  emptyAlert: { fontSize: 12, color: c.muted, border: `1px dashed ${c.line}`, padding: "14px 10px", textAlign: "center" },
};

// Checkout tab: barcode scan and scan log.
const CheckoutTab = ({ products, scanInput, setScanInput, log, onScan }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
    <div style={{ width: 240, flexShrink: 0 }}>
      <Label fr="FR-02">Scan a barcode</Label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onScan(scanInput);
        }}
        style={{ display: "flex", gap: 8, marginBottom: 14 }}
      >
        <input
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          placeholder="Barcode"
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <button type="submit" style={{ ...btn, flexShrink: 0 }}>
          Scan
        </button>
      </form>

      <Label>Sample items</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onScan(product.barcode)}
            style={{
              ...row,
              display: "flex",
              justifyContent: "space-between",
              background: c.bg,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 13 }}>{product.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: isLowStock(product) ? c.low : c.good }}>
              {product.stock}
            </span>
          </button>
        ))}
      </div>
    </div>

    <div style={{ flex: 1, minWidth: 240 }}>
      <Label fr="FR-03">Scan log</Label>
      <div style={{ border: `1px solid ${c.line}`, minHeight: 300, padding: "12px 14px", fontSize: 13 }}>
        {log.length === 0 && <div style={{ color: c.muted }}>No scans yet.</div>}
        {log.map((entry, index) => (
          <div key={`${entry.text}-${index}`} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>{entry.text}</span>
            <span style={{ color: c.muted }}>{entry.stamp}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Catalogue tab: list products, add new product, and adjust stock.
const CatalogueTab = ({ products, onAdd, onRestock, onAdjust, template }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", stock: "", reorder: "", expiry: "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      product.name.toLowerCase().includes(query) ||
      product.id.toLowerCase().includes(query)
    );
  });

  // Validate the form before creating a new product in the catalogue list.
  const submitAdd = (event) => {
    event.preventDefault();
    setError("");

    const id = form.id.trim().toUpperCase();
    const name = form.name.trim();

    if (!id || !name) return setError("FR-01: product code and name are required.");
    if (!new RegExp(template).test(id)) return setError(`FR-04: code must match template ${TEMPLATE_HINT}.`);
    if (products.some((product) => product.id === id)) return setError(`FR-01: a product with code "${id}" already exists.`);

    const duplicateName = products.find((product) => product.name.toLowerCase() === name.toLowerCase());
    if (duplicateName) return setError(`FR-01: a product named "${duplicateName.name}" already exists — flagged, not created.`);

    onAdd({
      id,
      name,
      barcode: String(Date.now()),
      stock: Number(form.stock) || 0,
      unit: "unit",
      reorder: Number(form.reorder) || 5,
      packLabel: "box",
      packQty: 1,
      expiry: parseDMY(form.expiry) || "2027-01-01",
    });

    setForm({ id: "", name: "", stock: "", reorder: "", expiry: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Label fr="FR-01">Products ({products.length})</Label>
        <button onClick={() => setShowAdd((current) => !current)} style={{ ...btn, padding: "6px 12px", fontSize: 12 }}>
          {showAdd ? "Cancel" : "Add product"}
        </button>
      </div>

      {showAdd && (
        // New product form is only shown when the user clicks "Add product".
        <form onSubmit={submitAdd} style={{ border: `1px solid ${c.line}`, padding: 14, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            placeholder={`Product code — ${TEMPLATE_HINT}`}
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
            style={inputStyle}
          />
          <input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Starting stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Reorder threshold"
            value={form.reorder}
            onChange={(e) => setForm({ ...form, reorder: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Expiry date (DD/MM/YYYY)"
            value={form.expiry}
            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
            style={inputStyle}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {error ? <span style={{ color: c.low, fontSize: 12 }}>{error}</span> : <span />}
            <button type="submit" style={btn}>
              Save product
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
          Search by name or code - FR-06
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code - FR-06"
          style={{ ...inputStyle, width: "100%" }}
        />
      </div>

      <div style={{ border: `1px solid ${c.line}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px 150px", padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${c.line}` }}>
          <span>Product</span>
          <span>Stock</span>
          <span>Reorder</span>
          <span>Expiry</span>
          <span>Actions</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: c.muted, fontSize: 13 }}>
            No products found.
          </div>
        ) : filteredProducts.map((product) => {
          const lowStock = isLowStock(product);
          const soon = isExpiringSoon(product);

          return (
            <div key={product.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px 150px", padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${c.faint}`, alignItems: "center" }}>
              <span>
                {product.name}
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 400, marginTop: 2 }}>{product.id}</div>
              </span>
              <span style={{ fontWeight: 700, color: lowStock ? c.low : c.good }}>
                {product.stock} {product.unit}s
              </span>
              <span style={{ color: c.muted }}>{product.reorder}</span>
              <span style={{ fontWeight: soon ? 700 : 400, color: soon ? c.low : c.muted }}>
                {formatDate(product.expiry)}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button
                  title={`Restock 1 ${product.packLabel} = ${product.packQty} ${product.unit}s (FR-05)`}
                  onClick={() => onRestock(product.id, product.packQty)}
                  style={{ border: `1px solid ${c.line}`, background: c.bg, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}
                >
                  +1 {product.packLabel}
                </button>
                <button
                  title="Manual adjustment, -1 (FR-07)"
                  onClick={() => onAdjust(product.id, -1)}
                  style={{ border: `1px solid ${c.line}`, background: c.bg, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}
                >
                  -1
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Admin tab: restricted view for stocktake and code template validation.
const AdminTab = ({ products, role, template, setTemplate }) => {
  if (role !== "admin") {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Access restricted</div>
        <div style={{ fontSize: 13, color: c.muted }}>Switch the role selector to "Admin" to view the stocktake.</div>
      </div>
    );
  }

  return (
    <div>
      <Label fr="FR-04">Product code template</Label>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>
        Regex applied to every new product code on the Catalogue tab. Default matches {TEMPLATE_HINT}.
      </div>
      <input
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${c.line}`, fontSize: 13, marginBottom: 24, fontFamily: "monospace" }}
      />

      <Label fr="FR-03">Stocktake - all products</Label>
      <div style={{ border: `1px solid ${c.line}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 100px", padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${c.line}` }}>
          <span>Code</span>
          <span>Product</span>
          <span>Stock</span>
          <span>Reorder</span>
          <span>Expiry</span>
        </div>

        {products.map((product) => {
          const lowStock = isLowStock(product);
          const soon = isExpiringSoon(product);

          return (
            <div key={product.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 100px", padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${c.faint}` }}>
              <span style={{ color: c.muted }}>{product.id}</span>
              <span>{product.name}</span>
              <span style={{ fontWeight: 700, color: lowStock ? c.low : c.good }}>
                {product.stock} {product.unit}s
              </span>
              <span style={{ color: c.muted }}>{product.reorder}</span>
              <span style={{ fontWeight: soon ? 700 : 400, color: soon ? c.low : c.muted }}>
                {formatDate(product.expiry)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  // Top-level state for selected tab, current user role, and inventory data.
  const [tab, setTab] = useState("checkout");
  const [role, setRole] = useState("cashier");
  const [products, setProducts] = useState(seedProducts);
  const [scanInput, setScanInput] = useState("");
  const [log, setLog] = useState([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  // Scan a barcode and reduce stock by one if the product is found.
  const onScan = (code) => {
    const trimmed = (code || scanInput).trim();
    if (!trimmed) return;

    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const product = products.find((item) => item.barcode === trimmed);

    if (!product) {
      setLog((entries) => [...entries, { text: `Not found: ${trimmed}`, stamp }]);
      setScanInput("");
      return;
    }

    const newStock = Math.max(0, product.stock - 1);
    setProducts((current) => updateProductStock(current, product.id, newStock));
    setLog((entries) => [...entries, { text: `${product.name} — ${newStock} ${product.unit}s left`, stamp }]);
    setScanInput("");
  };

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        {/* App header with role selector and navigation tabs. */}
        <div style={styles.header}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Inventory Prototype</span>

          <div style={styles.headerRight}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
            >
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>

            <div style={styles.tabGroup}>
              {tabs.map((tabItem) => {
                const active = tab === tabItem.id;

                return (
                  <button
                    key={tabItem.id}
                    onClick={() => setTab(tabItem.id)}
                    style={styles.tabButton(active)}
                  >
                    {tabItem.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main dashboard content that switches by active tab. */}
        <div style={styles.content}>
          <div style={styles.mainColumn}>
            {tab === "checkout" && <CheckoutTab products={products} scanInput={scanInput} setScanInput={setScanInput} log={log} onScan={onScan} />}
            {tab === "catalogue" && (
              <CatalogueTab
                products={products}
                template={template}
                onAdd={(newProduct) => setProducts((current) => [...current, newProduct])}
                onRestock={(id, qty) => setProducts((current) => current.map((product) => (product.id === id ? { ...product, stock: product.stock + qty } : product)))}
                onAdjust={(id, delta) => setProducts((current) => current.map((product) => (product.id === id ? { ...product, stock: Math.max(0, product.stock + delta) } : product)))}
              />
            )}
            {tab === "admin" && <AdminTab products={products} role={role} template={template} setTemplate={setTemplate} />}
          </div>

          {/* Alert panel showing low-stock and expiry warnings. */}
          <div style={styles.sidebar}>
            <Label fr="FR-03">Notifications</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {products.filter(isLowStock).map((product) => (
                <div key={`low-${product.id}`} style={styles.sidebarBox}>
                  Low stock: <span style={{ color: c.low, fontWeight: 700 }}>{product.name}</span> ({product.stock} {product.unit}s, expires {formatDate(product.expiry)})
                </div>
              ))}

              {products.filter((product) => isExpiringSoon(product) && !isLowStock(product)).map((product) => (
                <div key={`exp-${product.id}`} style={styles.sidebarBox}>
                  Expiry alert: <span style={{ color: c.low, fontWeight: 700 }}>{product.name}</span> in {daysUntil(product.expiry)}d ({formatDate(product.expiry)})
                </div>
              ))}

              {products.every((product) => !isLowStock(product) && !isExpiringSoon(product)) && (
                <div style={styles.emptyAlert}>
                  No alerts yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
