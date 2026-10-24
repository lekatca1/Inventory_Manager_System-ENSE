// Optional connection to the Java backend (see /backend).
// Set VITE_API_URL (e.g. http://localhost:8080/api) to use the backend; leave it unset to run
// on the built-in mock data exactly as in the original prototype.
const BASE = import.meta.env.VITE_API_URL;

export const enabled = Boolean(BASE);

let role = "cashier";
export const setRole = (r) => {
  role = r;
};

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Role": role },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const listProducts = () => request("GET", "/products");
export const createProduct = (product) => request("POST", "/products", product);
export const restock = (id, qty) => request("POST", `/products/${encodeURIComponent(id)}/restock`, { qty });
export const adjust = (id, delta) => request("POST", `/products/${encodeURIComponent(id)}/adjust`, { delta });
export const scan = (barcode) => request("POST", "/scan", { barcode });
export const getTemplate = () => request("GET", "/template").then((d) => d.template);
export const putTemplate = (template) => request("PUT", "/template", { template });
