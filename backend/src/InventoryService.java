import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/** Business rules. Validation lives here (not in the UI) so every client gets the same checks. */
public class InventoryService {
    public static final String DEFAULT_TEMPLATE = "^[A-Z]{3}-\\d{4}$";
    private static final int MAX_NUMBER = 1_000_000;

    private final Store store;

    public InventoryService(Store store) {
        this.store = store;
    }

    // FR-06: search by name or code
    public List<Product> list(String query) {
        return store.list(query);
    }

    // FR-01 (duplicates), FR-04 (code template)
    public Product create(Map<String, Object> b) {
        String id = text(b, "id", true).toUpperCase();
        String name = text(b, "name", true);
        if (!Pattern.compile(store.template()).matcher(id).find()) {
            throw new ApiException(400, "FR-04: code \"" + id + "\" does not match the template " + store.template());
        }
        if (store.byId(id).isPresent()) {
            throw new ApiException(409, "FR-01: a product with code \"" + id + "\" already exists.");
        }
        if (store.byName(name).isPresent()) {
            throw new ApiException(409, "FR-01: a product named \"" + name + "\" already exists.");
        }
        String barcode = text(b, "barcode", false);
        if (barcode.isEmpty()) barcode = String.valueOf(System.currentTimeMillis());
        if (store.byBarcode(barcode).isPresent()) {
            throw new ApiException(409, "A product with barcode \"" + barcode + "\" already exists.");
        }
        String unit = text(b, "unit", false);
        String packLabel = text(b, "packLabel", false);
        Product p = new Product(id, name, barcode,
                integer(b, "stock", 0, 0), unit.isEmpty() ? "unit" : unit,
                integer(b, "reorder", 5, 0), packLabel.isEmpty() ? "box" : packLabel,
                integer(b, "packQty", 1, 1), date(b, "expiry"));
        store.insert(p);
        return p;
    }

    // FR-05: restock by whole packs (qty = units added)
    public Product restock(String id, Map<String, Object> b) {
        int qty = integer(b, "qty", null, 1);
        return change(id, qty);
    }

    // FR-07: manual adjustment, never below zero
    public Product adjust(String id, Map<String, Object> b) {
        int delta = integer(b, "delta", null, -MAX_NUMBER);
        return change(id, delta);
    }

    // FR-02: barcode scan removes one unit
    public Product scan(Map<String, Object> b) {
        String barcode = text(b, "barcode", true);
        Product p = store.byBarcode(barcode)
                .orElseThrow(() -> new ApiException(404, "Not found: " + barcode));
        return change(p.id(), -1);
    }

    public String template() {
        return store.template();
    }

    // NFR-04: only admins may change the template
    public String setTemplate(String regex, String role) {
        if (!"admin".equals(role)) throw new ApiException(403, "Admin role required.");
        if (regex == null || regex.isBlank()) throw new ApiException(400, "Template must not be empty.");
        try {
            Pattern.compile(regex);
        } catch (PatternSyntaxException e) {
            throw new ApiException(400, "Template is not a valid regular expression.");
        }
        store.setTemplate(regex);
        return regex;
    }

    private Product change(String id, int delta) {
        return store.changeStock(id, delta)
                .orElseThrow(() -> new ApiException(404, "No product with code \"" + id + "\"."));
    }

    private static String text(Map<String, Object> b, String key, boolean required) {
        Object v = b.get(key);
        if (v == null) {
            if (required) throw new ApiException(400, "\"" + key + "\" is required.");
            return "";
        }
        if (!(v instanceof String s)) throw new ApiException(400, "\"" + key + "\" must be text.");
        String t = s.trim();
        if (required && t.isEmpty()) throw new ApiException(400, "\"" + key + "\" is required.");
        return t;
    }

    /** Whole number within [min, MAX_NUMBER]; def == null means the field is required. */
    private static int integer(Map<String, Object> b, String key, Integer def, int min) {
        Object v = b.get(key);
        if (v == null) {
            if (def == null) throw new ApiException(400, "\"" + key + "\" is required.");
            return def;
        }
        if (!(v instanceof Number n)) throw new ApiException(400, "\"" + key + "\" must be a number.");
        double d = n.doubleValue();
        if (d != Math.rint(d) || Double.isInfinite(d)) {
            throw new ApiException(400, "\"" + key + "\" must be a whole number.");
        }
        if (d < min || d > MAX_NUMBER) {
            throw new ApiException(400, "\"" + key + "\" must be between " + min + " and " + MAX_NUMBER + ".");
        }
        return (int) d;
    }

    private static String date(Map<String, Object> b, String key) {
        String t = text(b, key, true);
        try {
            return LocalDate.parse(t).toString();
        } catch (DateTimeParseException e) {
            throw new ApiException(400, "\"" + key + "\" must be a real date in YYYY-MM-DD format.");
        }
    }
}
