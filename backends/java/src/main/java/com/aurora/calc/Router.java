package com.aurora.calc;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class Router {
    private static final Set<String> ALLOWED = Set.of("add", "subtract", "multiply", "divide");

    public record Response(int status, Map<String, String> headers, String body) {
    }

    public Response handle(String method, String path, Map<String, String> query) {
        Map<String, String> headers = baseHeaders();

        if ("OPTIONS".equals(method)) {
            return new Response(204, headers, null);
        }

        if (!"GET".equals(method)) {
            headers.put("Allow", "GET, OPTIONS");
            return error(405, headers, "Méthode non autorisée. Utiliser GET.");
        }

        if (!"/calculate".equals(path)) {
            return error(404, headers, "Route introuvable.");
        }

        String operation = query.get("operation");
        String a = query.get("a");
        String b = query.get("b");

        if (operation == null || a == null || b == null) {
            return error(400, headers, "Paramètres attendus : operation, a, b");
        }

        Double numA = parseNumber(a);
        Double numB = parseNumber(b);
        if (numA == null || numB == null) {
            return error(400, headers, "Les paramètres a et b doivent être des nombres.");
        }

        if (!ALLOWED.contains(operation)) {
            return error(400, headers, "Opération inconnue. Utiliser : add, subtract, multiply, divide");
        }

        Calculator calc = new Calculator();
        double result;
        try {
            switch (operation) {
                case "add" -> result = calc.add(numA, numB);
                case "subtract" -> result = calc.subtract(numA, numB);
                case "multiply" -> result = calc.multiply(numA, numB);
                default -> result = calc.divide(numA, numB);
            }
        } catch (ArithmeticException e) {
            return error(400, headers, e.getMessage());
        }

        String body = "{\"operation\":\"" + operation + "\",\"a\":" + numberJson(numA)
                + ",\"b\":" + numberJson(numB) + ",\"result\":" + numberJson(result) + "}";
        return new Response(200, headers, body);
    }

    private static Map<String, String> baseHeaders() {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, Authorization");
        headers.put("Content-Type", "application/json; charset=utf-8");
        return headers;
    }

    private static Response error(int status, Map<String, String> headers, String message) {
        return new Response(status, headers, "{\"error\":\"" + escape(message) + "\"}");
    }

    private static Double parseNumber(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Sérialise un nombre comme le ferait JSON.stringify côté Node :
     * entier quand la valeur est entière, et null pour l'infini/NaN.
     */
    private static String numberJson(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) {
            return "null";
        }
        if (v == Math.rint(v) && Math.abs(v) < 9.007199254740992E15) {
            return Long.toString((long) v);
        }
        return Double.toString(v);
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
