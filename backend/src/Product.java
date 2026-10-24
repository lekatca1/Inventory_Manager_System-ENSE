import java.util.LinkedHashMap;
import java.util.Map;

/** One inventory item. Field names match the React frontend's product objects. */
public record Product(String id, String name, String barcode, int stock, String unit,
                      int reorder, String packLabel, int packQty, String expiry) {

    Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("barcode", barcode);
        m.put("stock", stock);
        m.put("unit", unit);
        m.put("reorder", reorder);
        m.put("packLabel", packLabel);
        m.put("packQty", packQty);
        m.put("expiry", expiry);
        return m;
    }
}
