import java.util.List;
import java.util.Optional;

/** Storage abstraction: SQLite for real use (SqliteStore), memory for quick tests (MemoryStore). */
public interface Store {
    List<Product> list(String query);

    Optional<Product> byId(String id);

    Optional<Product> byBarcode(String barcode);

    /** Case-insensitive name lookup, used for duplicate detection. */
    Optional<Product> byName(String name);

    void insert(Product p);

    /** Adds delta to stock, never going below zero. Returns the updated product. */
    Optional<Product> changeStock(String id, int delta);

    String template();

    void setTemplate(String regex);
}
