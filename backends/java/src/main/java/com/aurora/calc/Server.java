package com.aurora.calc;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

public final class Server {

    private static final Router ROUTER = new Router();

    public static HttpServer start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new CalculateHandler());
        server.setExecutor(null);
        server.start();
        return server;
    }

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "3002"));
        start(port);
        System.out.println("Backend Java disponible sur http://localhost:" + port);
    }

    static final class CalculateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());

            Router.Response response = ROUTER.handle(method, path, query);
            response.headers().forEach((k, v) -> exchange.getResponseHeaders().set(k, v));

            if (response.body() == null) {
                exchange.sendResponseHeaders(response.status(), -1);
            } else {
                byte[] bytes = response.body().getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(response.status(), bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
            exchange.close();
        }
    }

    static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> params = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) {
            return params;
        }
        for (String pair : rawQuery.split("&")) {
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            String value = eq >= 0 ? pair.substring(eq + 1) : "";
            params.put(decode(key), decode(value));
        }
        return params;
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }
}
