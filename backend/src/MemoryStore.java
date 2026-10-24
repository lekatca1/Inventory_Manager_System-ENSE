import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** In-memory store seeded with the same five products as the frontend mock data. */
public class MemoryStore implements Store {
    private final Map<String, Product> products = new LinkedHashMap<>();
    private String template = InventoryService.DEFAULT_TEMPLATE;

    public MemoryStore() {
        add(new Product("GRC-0001", "Basmati Rice 5kg", "8901030875021", 42, "bag", 10, "case", 6, "2026-12-01"));
        add(new Product("GRC-0002", "Coconut Milk 400ml", "8850124301029", 8, "can", 12, "box", 24, "2026-09-04"));
        add(new Product("GRC-0003", "Fresh Tofu 300g", "8992772100118", 15, "pack", 6, "tray", 8, "2026-09-02"));
        add(new Product("GRC-0004", "Dried Shiitake 100g", "8710398512207", 3, "bag", 5, "carton", 10, "2027-03-15"));
        add(new Product("GRC-0005", "Soy Sauce 1L", "8801043019284", 27, "bottle", 8, "case", 12, "2027-01-20"));
    }

    private void add(Product p) {
        products.put(p.id(), p);
    }

    @Override
    public synchronized List<Product> list(String query) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        List<Product> out = new ArrayList<>();
        for (Product p : products.values()) {
            if (q.isEmpty() || p.name().toLowerCase(Locale.ROOT).contains(q)
                    || p.id().toLowerCase(Locale.ROOT).contains(q)) {
                out.add(p);
            }
        }
        return out;
    }

    @Override
    public synchronized Optional<Product> byId(String id) {
        return Optional.ofNullable(products.get(id));
    }

    @Override
    public synchronized Optional<Product> byBarcode(String barcode) {
        return products.values().stream().filter(p -> p.barcode().equals(barcode)).findFirst();
    }

    @Override
    public synchronized Optional<Product> byName(String name) {
        return products.values().stream().filter(p -> p.name().equalsIgnoreCase(name)).findFirst();
    }

    @Override
    public synchronized void insert(Product p) {
        add(p);
    }

    @Override
    public synchronized Optional<Product> changeStock(String id, int delta) {
        Product p = products.get(id);
        if (p == null) return Optional.empty();
        Product updated = new Product(p.id(), p.name(), p.barcode(), (int) Math.max(0L, (long) p.stock() + delta),
                p.unit(), p.reorder(), p.packLabel(), p.packQty(), p.expiry());
        products.put(id, updated);
        return Optional.of(updated);
    }

    @Override
    public synchronized String template() {
        return template;
    }

    @Override
    public synchronized void setTemplate(String regex) {
        this.template = regex;
    }
}
