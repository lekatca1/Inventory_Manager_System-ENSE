import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** SQLite store. Needs the sqlite-jdbc driver jar on the classpath at runtime. */
public class SqliteStore implements Store {
    private static final String COLUMNS = "id, name, barcode, stock, unit, reorder, pack_label, pack_qty, expiry";

    private final Connection db; // one connection, so ":memory:" databases also work

    public SqliteStore(String url) {
        try {
            db = DriverManager.getConnection(url);
            createTables();
        } catch (SQLException e) {
            throw new IllegalStateException("Could not open database: " + e.getMessage(), e);
        }
    }

    // Create the tables on first run and add the starter products.
    private void createTables() throws SQLException {
        try (Statement s = db.createStatement()) {
            s.execute("CREATE TABLE IF NOT EXISTS products ("
                    + "id TEXT PRIMARY KEY, "
                    + "name TEXT NOT NULL UNIQUE COLLATE NOCASE, " // NOCASE = duplicate names ignore case
                    + "barcode TEXT NOT NULL UNIQUE, "
                    + "stock INTEGER NOT NULL CHECK (stock >= 0), "
                    + "unit TEXT NOT NULL, "
                    + "reorder INTEGER NOT NULL CHECK (reorder >= 0), "
                    + "pack_label TEXT NOT NULL, "
                    + "pack_qty INTEGER NOT NULL CHECK (pack_qty >= 1), "
                    + "expiry TEXT NOT NULL)");
            s.execute("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
            try (ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM products")) {
                if (rs.next() && rs.getInt(1) == 0) {
                    for (Product p : new MemoryStore().list("")) insert(p); // reuse the seed data
                }
            }
        }
    }

    private static Product read(ResultSet rs) throws SQLException {
        return new Product(rs.getString("id"), rs.getString("name"), rs.getString("barcode"),
                rs.getInt("stock"), rs.getString("unit"), rs.getInt("reorder"),
                rs.getString("pack_label"), rs.getInt("pack_qty"), rs.getString("expiry"));
    }

    // Find at most one product, e.g. where = "id = ?".
    private Optional<Product> find(String where, String value) {
        try (PreparedStatement ps = db.prepareStatement("SELECT " + COLUMNS + " FROM products WHERE " + where)) {
            ps.setString(1, value);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(read(rs)) : Optional.empty();
            }
        } catch (SQLException e) {
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
    }

    @Override
    public synchronized List<Product> list(String query) {
        // Escape % and _ so they are searched as normal characters. SQLite LIKE ignores case.
        String q = (query == null ? "" : query.trim())
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        String sql = "SELECT " + COLUMNS + " FROM products "
                + "WHERE name LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\' ORDER BY id";
        try (PreparedStatement ps = db.prepareStatement(sql)) {
            ps.setString(1, "%" + q + "%");
            ps.setString(2, "%" + q + "%");
            List<Product> out = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(read(rs));
            }
            return out;
        } catch (SQLException e) {
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
    }

    @Override
    public synchronized Optional<Product> byId(String id) {
        return find("id = ?", id);
    }

    @Override
    public synchronized Optional<Product> byBarcode(String barcode) {
        return find("barcode = ?", barcode);
    }

    @Override
    public synchronized Optional<Product> byName(String name) {
        return find("name = ?", name); // the column is NOCASE, so this ignores case
    }

    @Override
    public synchronized void insert(Product p) {
        String sql = "INSERT INTO products (" + COLUMNS + ") VALUES (?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement ps = db.prepareStatement(sql)) {
            ps.setString(1, p.id());
            ps.setString(2, p.name());
            ps.setString(3, p.barcode());
            ps.setInt(4, p.stock());
            ps.setString(5, p.unit());
            ps.setInt(6, p.reorder());
            ps.setString(7, p.packLabel());
            ps.setInt(8, p.packQty());
            ps.setString(9, p.expiry());
            ps.executeUpdate();
        } catch (SQLException e) {
            if (e.getMessage().contains("UNIQUE")) {
                throw new ApiException(409, "A product with that code, name or barcode already exists.");
            }
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
    }

    @Override
    public synchronized Optional<Product> changeStock(String id, int delta) {
        // MAX(0, ...) stops stock going below zero.
        try (PreparedStatement ps = db.prepareStatement("UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?")) {
            ps.setInt(1, delta);
            ps.setString(2, id);
            if (ps.executeUpdate() == 0) return Optional.empty();
        } catch (SQLException e) {
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
        return byId(id);
    }

    @Override
    public synchronized String template() {
        try (PreparedStatement ps = db.prepareStatement("SELECT v FROM settings WHERE k = 'code_template'");
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getString(1) : InventoryService.DEFAULT_TEMPLATE;
        } catch (SQLException e) {
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
    }

    @Override
    public synchronized void setTemplate(String regex) {
        try (PreparedStatement ps = db.prepareStatement("INSERT OR REPLACE INTO settings (k, v) VALUES ('code_template', ?)")) {
            ps.setString(1, regex);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new ApiException(500, "Database error: " + e.getMessage());
        }
    }
}
