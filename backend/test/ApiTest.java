import com.sun.net.httpserver.HttpServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

/** API tests. Use "sqlite" as the argument to test the SQLite store instead of the in-memory one. */
public class ApiTest {
    static int failures = 0;
    static int checks = 0;
    static HttpClient http = HttpClient.newHttpClient();
    static String base;

    record Res(int status, Object json) {
        @SuppressWarnings("unchecked")
        Map<String, Object> map() { return (Map<String, Object>) json; }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list() { return (List<Map<String, Object>>) json; }
    }

    static Res call(String method, String path, String body, String role) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (role != null) b.header("X-Role", role);
        HttpResponse<String> r = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        return new Res(r.statusCode(), Json.parse(r.body()));
    }

    static Res get(String p) throws Exception { return call("GET", p, null, null); }
    static Res post(String p, String body) throws Exception { return call("POST", p, body, null); }

    static void check(String name, boolean ok) {
        checks++;
        if (!ok) failures++;
        System.out.println((ok ? "PASS  " : "FAIL  ") + name);
    }

    static double stockOf(String code) throws Exception {
        for (Map<String, Object> p : get("/products").list()) if (p.get("id").equals(code)) return (Double) p.get("stock");
        return -1;
    }

    static String newProduct(String id, String name, String stock, String reorder, String expiry) {
        return "{\"id\":\"" + id + "\",\"name\":\"" + name + "\",\"stock\":" + stock + ",\"reorder\":" + reorder
                + ",\"expiry\":\"" + expiry + "\"}";
    }

    public static void main(String[] args) throws Exception {
        // Fresh data for every run: in-memory store, or an in-memory SQLite database.
        Store store = args.length > 0 && args[0].equals("sqlite") ? new SqliteStore("jdbc:sqlite::memory:") : new MemoryStore();
        HttpServer server = ApiServer.start(new InventoryService(store), 0);
        base = "http://localhost:" + server.getAddress().getPort() + "/api";
        try {
            check("health endpoint responds ok", get("/health").status() == 200);

            Res all = get("/products");
            check("lists the 5 seeded products", all.status() == 200 && all.list().size() == 5);
            check("FR-06 search by name (case-insensitive)", get("/products?q=tofu").list().size() == 1);
            check("FR-06 search by code", get("/products?q=GRC-0003").list().size() == 1);
            check("FR-06 search with no match returns empty list", get("/products?q=zzz").list().isEmpty());

            check("FR-02 scan reduces stock by 1", post("/scan", "{\"barcode\":\"8901030875021\"}").map().get("stock").equals(41.0));
            check("FR-02 unknown barcode returns 404", post("/scan", "{\"barcode\":\"000\"}").status() == 404);
            check("FR-02 scan never takes stock below 0", scanToZero());

            double before = stockOf("GRC-0001");
            Res rs = post("/products/GRC-0001/restock", "{\"qty\":6}");
            check("FR-05 restock adds the pack quantity", rs.status() == 200 && (Double) rs.map().get("stock") == before + 6);
            check("FR-05 restock rejects zero/negative qty", post("/products/GRC-0001/restock", "{\"qty\":0}").status() == 400
                    && post("/products/GRC-0001/restock", "{\"qty\":-5}").status() == 400);
            check("FR-05 restock of unknown product returns 404", post("/products/GRC-9999/restock", "{\"qty\":1}").status() == 404);

            before = stockOf("GRC-0005");
            check("FR-07 adjust -1 reduces stock", (Double) post("/products/GRC-0005/adjust", "{\"delta\":-1}").map().get("stock") == before - 1);
            check("FR-07 adjust below zero clamps at 0", (Double) post("/products/GRC-0004/adjust", "{\"delta\":-500}").map().get("stock") == 0.0);
            check("FR-07 non-numeric delta rejected", post("/products/GRC-0005/adjust", "{\"delta\":\"abc\"}").status() == 400);
            check("FR-07 fractional delta rejected", post("/products/GRC-0005/adjust", "{\"delta\":1.5}").status() == 400);

            Res created = post("/products", newProduct("grc-0006", "Green Tea 50g", "20", "5", "2027-05-01"));
            check("FR-01 create product succeeds (code upper-cased)", created.status() == 200 && created.map().get("id").equals("GRC-0006"));
            check("FR-01 duplicate code rejected with 409", post("/products", newProduct("GRC-0006", "Other Name", "1", "1", "2027-05-01")).status() == 409);
            check("FR-01 duplicate name rejected (case-insensitive)", post("/products", newProduct("GRC-0007", "green tea 50G", "1", "1", "2027-05-01")).status() == 409);
            check("FR-01 missing name rejected", post("/products", "{\"id\":\"GRC-0008\",\"expiry\":\"2027-05-01\"}").status() == 400);
            check("FR-04 code not matching template rejected", post("/products", newProduct("BAD-1", "Bad Code Item", "1", "1", "2027-05-01")).status() == 400);

            check("D-05/D-06 negative starting stock rejected", post("/products", newProduct("GRC-0009", "Negative Item", "-5", "1", "2027-05-01")).status() == 400);
            check("D-05/D-06 impossible date rejected", post("/products", newProduct("GRC-0010", "Bad Date Item", "1", "1", "2027-02-31")).status() == 400);
            check("malformed JSON rejected with 400", post("/products", "{not json").status() == 400);

            check("FR-04 GET template returns default", get("/template").map().get("template").equals("^[A-Z]{3}-\\d{4}$"));
            check("NFR-04 cashier cannot change template (403)", call("PUT", "/template", "{\"template\":\"^X$\"}", "cashier").status() == 403);
            check("NFR-04 no role cannot change template (403)", call("PUT", "/template", "{\"template\":\"^X$\"}", null).status() == 403);
            check("NFR-04 admin can change template", call("PUT", "/template", "{\"template\":\"^[A-Z]{2}-\\\\d{3}$\"}", "admin").status() == 200);
            check("template change applies to new products", post("/products", newProduct("GRC-0011", "Old Format Item", "1", "1", "2027-05-01")).status() == 400
                    && post("/products", newProduct("AB-123", "New Format Item", "1", "1", "2027-05-01")).status() == 200);
            check("invalid regex template rejected", call("PUT", "/template", "{\"template\":\"[\"}", "admin").status() == 400);

            check("unknown endpoint returns 404", get("/nope").status() == 404);
        } finally {
            server.stop(0);
        }
        System.out.println("\n" + (checks - failures) + "/" + checks + " checks passed");
        if (failures > 0) System.exit(1);
    }

    static boolean scanToZero() throws Exception {
        // GRC-0004 (shiitake) starts at 3; scan it down past zero.
        Res last = null;
        for (int i = 0; i < 5; i++) last = post("/scan", "{\"barcode\":\"8710398512207\"}");
        return last != null && last.status() == 200 && last.map().get("stock").equals(0.0);
    }
}
