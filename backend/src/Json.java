import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Minimal JSON reader/writer so the backend needs no third-party libraries. */
public final class Json {
    private final String s;
    private int i;

    private Json(String s) {
        this.s = s;
    }

    public static Object parse(String text) {
        Json p = new Json(text == null ? "" : text);
        p.ws();
        Object v = p.value();
        p.ws();
        if (p.i != p.s.length()) throw p.fail("Unexpected trailing characters");
        return v;
    }

    private ApiException fail(String msg) {
        return new ApiException(400, "Invalid JSON: " + msg);
    }

    private void ws() {
        while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
    }

    private Object value() {
        if (i >= s.length()) throw fail("unexpected end");
        char ch = s.charAt(i);
        if (ch == '{') return object();
        if (ch == '[') return array();
        if (ch == '"') return string();
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        if (s.startsWith("null", i)) { i += 4; return null; }
        return number();
    }

    private Map<String, Object> object() {
        Map<String, Object> m = new LinkedHashMap<>();
        i++;
        ws();
        if (i < s.length() && s.charAt(i) == '}') { i++; return m; }
        while (true) {
            ws();
            if (i >= s.length() || s.charAt(i) != '"') throw fail("expected key");
            String k = string();
            ws();
            if (i >= s.length() || s.charAt(i) != ':') throw fail("expected ':'");
            i++;
            ws();
            m.put(k, value());
            ws();
            if (i >= s.length()) throw fail("unterminated object");
            char ch = s.charAt(i++);
            if (ch == '}') return m;
            if (ch != ',') throw fail("expected ',' or '}'");
        }
    }

    private List<Object> array() {
        List<Object> l = new ArrayList<>();
        i++;
        ws();
        if (i < s.length() && s.charAt(i) == ']') { i++; return l; }
        while (true) {
            ws();
            l.add(value());
            ws();
            if (i >= s.length()) throw fail("unterminated array");
            char ch = s.charAt(i++);
            if (ch == ']') return l;
            if (ch != ',') throw fail("expected ',' or ']'");
        }
    }

    private String string() {
        StringBuilder sb = new StringBuilder();
        i++;
        while (i < s.length()) {
            char ch = s.charAt(i++);
            if (ch == '"') return sb.toString();
            if (ch == '\\') {
                if (i >= s.length()) break;
                char e = s.charAt(i++);
                switch (e) {
                    case 'n' -> sb.append('\n');
                    case 't' -> sb.append('\t');
                    case 'r' -> sb.append('\r');
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'u' -> {
                        if (i + 4 > s.length()) throw fail("bad unicode escape");
                        try {
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                        } catch (NumberFormatException ex) {
                            throw fail("bad unicode escape");
                        }
                        i += 4;
                    }
                    default -> sb.append(e);
                }
            } else {
                sb.append(ch);
            }
        }
        throw fail("unterminated string");
    }

    private Double number() {
        int start = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
        if (start == i) throw fail("unexpected character '" + s.charAt(i) + "'");
        try {
            return Double.valueOf(s.substring(start, i));
        } catch (NumberFormatException e) {
            throw fail("bad number");
        }
    }

    // ---- writer ----

    public static String write(Object o) {
        StringBuilder sb = new StringBuilder();
        write(o, sb);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void write(Object o, StringBuilder sb) {
        if (o == null) sb.append("null");
        else if (o instanceof Product p) write(p.toMap(), sb);
        else if (o instanceof String str) quote(str, sb);
        else if (o instanceof Number || o instanceof Boolean) sb.append(o);
        else if (o instanceof Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) m).entrySet()) {
                if (!first) sb.append(',');
                first = false;
                quote(e.getKey(), sb);
                sb.append(':');
                write(e.getValue(), sb);
            }
            sb.append('}');
        } else if (o instanceof List<?> l) {
            sb.append('[');
            for (int k = 0; k < l.size(); k++) {
                if (k > 0) sb.append(',');
                write(l.get(k), sb);
            }
            sb.append(']');
        } else {
            quote(o.toString(), sb);
        }
    }

    private static void quote(String str, StringBuilder sb) {
        sb.append('"');
        for (char ch : str.toCharArray()) {
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) sb.append(String.format("\\u%04x", (int) ch));
                    else sb.append(ch);
                }
            }
        }
        sb.append('"');
    }
}
