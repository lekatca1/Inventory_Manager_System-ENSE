import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/** HTTP/JSON layer using the JDK's built-in server. */
public class ApiServer {

    public static HttpServer start(InventoryService service, int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api", ex -> handle(service, ex));
        server.start();
        return server;
    }

    private static void handle(InventoryService svc, HttpExchange ex) throws IOException {
        // CORS so the Vite dev server (a different origin) can call the API.
        ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Role");
        ex.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
        try {
            if (ex.getRequestMethod().equals("OPTIONS")) {
                ex.sendResponseHeaders(204, -1);
                return;
            }
            Object result = route(svc, ex);
            send(ex, 200, Json.write(result));
        } catch (ApiException e) {
            send(ex, e.status, Json.write(Map.of("error", e.getMessage())));
        } catch (RuntimeException e) {
            e.printStackTrace();
            send(ex, 500, Json.write(Map.of("error", "Internal server error.")));
        } finally {
            ex.close();
        }
    }

    private static Object route(InventoryService svc, HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod();
        String[] parts = ex.getRequestURI().getPath().replaceFirst("^/api/?", "").split("/");
        String first = parts[0];

        if (method.equals("GET") && first.equals("health")) return Map.of("status", "ok");

        if (first.equals("products")) {
            if (parts.length == 1 && method.equals("GET")) return svc.list(queryParam(ex, "q"));
            if (parts.length == 1 && method.equals("POST")) return svc.create(body(ex));
            if (parts.length == 3 && method.equals("POST")) {
                String id = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                if (parts[2].equals("restock")) return svc.restock(id, body(ex));
                if (parts[2].equals("adjust")) return svc.adjust(id, body(ex));
            }
        } else if (first.equals("scan") && method.equals("POST")) {
            return svc.scan(body(ex));
        } else if (first.equals("template")) {
            if (method.equals("GET")) return Map.of("template", svc.template());
            if (method.equals("PUT")) {
                Object t = body(ex).get("template");
                String regex = t instanceof String s ? s : null;
                return Map.of("template", svc.setTemplate(regex, ex.getRequestHeaders().getFirst("X-Role")));
            }
        }
        throw new ApiException(404, "No such endpoint: " + method + " " + ex.getRequestURI().getPath());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> body(HttpExchange ex) throws IOException {
        try (InputStream in = ex.getRequestBody()) {
            String text = new String(in.readNBytes(1_000_000), StandardCharsets.UTF_8);
            Object parsed = Json.parse(text.isBlank() ? "{}" : text);
            if (!(parsed instanceof Map)) throw new ApiException(400, "Request body must be a JSON object.");
            return (Map<String, Object>) parsed;
        }
    }

    private static String queryParam(HttpExchange ex, String name) {
        String raw = ex.getRequestURI().getRawQuery();
        if (raw == null) return "";
        Map<String, String> params = new LinkedHashMap<>();
        for (String pair : raw.split("&")) {
            int eq = pair.indexOf('=');
            String k = URLDecoder.decode(eq < 0 ? pair : pair.substring(0, eq), StandardCharsets.UTF_8);
            String v = eq < 0 ? "" : URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            params.put(k, v);
        }
        return params.getOrDefault(name, "");
    }

    private static void send(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
    }

    public static void main(String[] args) throws IOException {
        // Default: SQLite file. Run with the argument "memory" to use throw-away in-memory data.
        Store store;
        if (args.length > 0 && args[0].equals("memory")) {
            store = new MemoryStore();
            System.out.println("Using in-memory data (resets on restart).");
        } else {
            String url = System.getenv().getOrDefault("DB_URL", "jdbc:sqlite:inventory.db");
            store = new SqliteStore(url);
            System.out.println("Using SQLite database " + url);
        }
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        start(new InventoryService(store), port);
        System.out.println("API listening on http://localhost:" + port + "/api");
    }
}
