package com.aurora.calc;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests d'intégration : démarre le vrai HttpServer du backend et interroge
 * /calculate par HTTP. Équivalent Java de tests/api.test.js.
 */
class ApiTest {

    private static HttpServer server;
    private static String base;

    @BeforeAll
    static void startServer() throws IOException {
        server = Server.start(0); // port éphémère
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    private record Res(int status, String body, java.util.Map<String, java.util.List<String>> headers) {
    }

    private Res request(String path, String method) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) URI.create(base + path).toURL().openConnection();
        conn.setRequestMethod(method);
        int status = conn.getResponseCode();
        InputStream stream = status < 400 ? conn.getInputStream() : conn.getErrorStream();
        String body = "";
        if (stream != null) {
            body = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        var headers = conn.getHeaderFields();
        conn.disconnect();
        return new Res(status, body, headers);
    }

    private static String header(Res res, String name) {
        for (var entry : res.headers().entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(name)) {
                return entry.getValue().get(0);
            }
        }
        return null;
    }

    private static String field(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\"\\s*:\\s*(?:\"([^\"]*)\"|([^,}]+))").matcher(json);
        if (m.find()) {
            return m.group(1) != null ? m.group(1) : m.group(2).trim();
        }
        return null;
    }

    @Test
    void nominalCases() throws IOException {
        String[][] cases = {
                {"add", "2", "3", "5"},
                {"subtract", "10", "4", "6"},
                {"multiply", "6", "7", "42"},
                {"divide", "20", "5", "4"},
                {"add", "-5", "-3", "-8"},
                {"multiply", "-3", "-4", "12"},
        };
        for (String[] c : cases) {
            Res res = request("/calculate?operation=" + c[0] + "&a=" + c[1] + "&b=" + c[2], "GET");
            assertEquals(200, res.status(), "statut pour " + c[0]);
            assertEquals(c[3], field(res.body(), "result"), "résultat pour " + c[0]);
            assertEquals(c[0], field(res.body(), "operation"));
        }
    }

    @Test
    void responseHeaders() throws IOException {
        Res res = request("/calculate?operation=add&a=1&b=2", "GET");
        assertEquals("application/json; charset=utf-8", header(res, "Content-Type"));
        assertEquals("*", header(res, "Access-Control-Allow-Origin"));
    }

    @Test
    void decimalDivision() throws IOException {
        Res res = request("/calculate?operation=divide&a=10&b=3", "GET");
        assertEquals(200, res.status());
        double result = Double.parseDouble(field(res.body(), "result"));
        assertTrue(Math.abs(result - 3.3333) < 0.01, "résultat ≈ 3.333");
    }

    @Test
    void optionsPreflight() throws IOException {
        Res res = request("/calculate", "OPTIONS");
        assertEquals(204, res.status());
        assertEquals("", res.body());
        assertEquals("*", header(res, "Access-Control-Allow-Origin"));
        assertTrue(header(res, "Access-Control-Allow-Methods").contains("GET"));
    }

    @Test
    void methodNotAllowed() throws IOException {
        Res res = request("/calculate", "POST");
        assertEquals(405, res.status());
        assertNotNull(field(res.body(), "error"));
        assertTrue(header(res, "Allow").contains("GET"));
    }

    @Test
    void missingParamReturns400() throws IOException {
        Res res = request("/calculate?operation=add&a=2", "GET");
        assertEquals(400, res.status());
        assertTrue(field(res.body(), "error").contains("Paramètres attendus"));
    }

    @Test
    void nonNumericReturns400() throws IOException {
        Res res = request("/calculate?operation=add&a=abc&b=3", "GET");
        assertEquals(400, res.status());
        assertTrue(field(res.body(), "error").contains("doivent être des nombres"));
    }

    @Test
    void divisionByZeroReturns400() throws IOException {
        Res res = request("/calculate?operation=divide&a=10&b=0", "GET");
        assertEquals(400, res.status());
        assertEquals("Division par zéro impossible.", field(res.body(), "error"));
    }

    @Test
    void unknownOperationReturns400() throws IOException {
        Res res = request("/calculate?operation=modulo&a=10&b=3", "GET");
        assertEquals(400, res.status());
        assertTrue(field(res.body(), "error").contains("Opération inconnue"));
    }

    @Test
    void unknownRouteReturns404() throws IOException {
        Res res = request("/unknown", "GET");
        assertEquals(404, res.status());
        assertEquals("Route introuvable.", field(res.body(), "error"));
    }
}
