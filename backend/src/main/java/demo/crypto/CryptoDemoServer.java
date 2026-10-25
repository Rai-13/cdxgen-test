package demo.crypto;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Random;

/** Fictional private-client portal with intentionally weak crypto fixtures for local CBOM testing. */
public final class CryptoDemoServer {
    private static final String DEMO_PASSWORD = "northstar-demo-password";
    private static final byte[] STATIC_DES_KEY = "N0rth$ta".getBytes(StandardCharsets.UTF_8);

    private CryptoDemoServer() {}

    public static void main(String[] args) throws Exception {
        int port = args.length == 0 ? 8081 : Integer.parseInt(args[0]);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/dashboard", CryptoDemoServer::handleDashboard);
        server.createContext("/api/demo", CryptoDemoServer::handleDashboard);
        server.createContext("/api/health", exchange -> respond(exchange, 200, "{\"status\":\"ok\",\"service\":\"northstar-java-api\"}"));
        server.createContext("/", exchange -> handleRoot(exchange, port));
        server.start();
        System.out.println("Northstar Java API listening at http://127.0.0.1:" + port);
    }

    private static void handleRoot(HttpExchange exchange, int port) throws IOException {
        if (!"/".equals(exchange.getRequestURI().getPath())) {
            respond(exchange, 404, "{\"error\":\"Not found\",\"routes\":[\"/api/dashboard\",\"/api/health\"]}");
            return;
        }
        String page = "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Northstar API</title>"
                + "<body style=\"font:16px system-ui;max-width:680px;margin:4rem auto;padding:0 1rem;background:#101827;color:#eef2f7\">"
                + "<h1>Northstar API is running</h1><p>Open the private-client workspace in the Node.js frontend.</p>"
                + "<p><a style=\"color:#b9e4cf\" href=\"http://localhost:3000\">Open Northstar workspace</a></p>"
                + "<p>API: <a style=\"color:#b9e4cf\" href=\"/api/dashboard\">/api/dashboard</a> · <a style=\"color:#b9e4cf\" href=\"/api/health\">/api/health</a></p>"
                + "<small>Backend port: " + port + "</small></body></html>";
        byte[] bytes = page.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }

    private static void handleDashboard(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            respond(exchange, 405, "{\"error\":\"GET only\"}");
            return;
        }

        // Demo flows represent document fingerprinting, file encryption and session issuance.
        String invoiceFingerprint = digest("SHA-1", "INV-2048|northstar-demo-password");
        String encryptedInvoice = encryptInvoice("Q3-supplier-invoice-2048");
        int sessionToken = new Random(74021L).nextInt();

        String json = "{"
                + "\"workspace\":{\"company\":\"Northstar Private Client\",\"name\":\"Document operations\",\"environment\":\"Sandbox\"},"
                + "\"summary\":{\"documents\":128,\"shared\":9,\"pendingReview\":4,\"findings\":7},"
                + "\"documents\":["
                + "{\"name\":\"Q3 Supplier Invoice\",\"type\":\"Finance\",\"owner\":\"Prateek Chen\",\"updated\":\"Today, 09:42\",\"size\":\"2.4 MB\",\"state\":\"Legacy encrypted\",\"tone\":\"amber\"},"
                + "{\"name\":\"Asteron Holdings — KYC\",\"type\":\"Client records\",\"owner\":\"Elliot Park\",\"updated\":\"Today, 08:16\",\"size\":\"840 KB\",\"state\":\"Review needed\",\"tone\":\"red\"},"
                + "{\"name\":\"Custody agreement v4\",\"type\":\"Legal\",\"owner\":\"Nina Patel\",\"updated\":\"Yesterday\",\"size\":\"1.1 MB\",\"state\":\"Legacy encrypted\",\"tone\":\"amber\"},"
                + "{\"name\":\"April portfolio statement\",\"type\":\"Reporting\",\"owner\":\"Prateek Chen\",\"updated\":\"Yesterday\",\"size\":\"612 KB\",\"state\":\"Shared · 2 people\",\"tone\":\"green\"}],"
                + "\"activity\":["
                + "{\"event\":\"Invoice fingerprint generated\",\"actor\":\"Document service\",\"time\":\"09:42:18\",\"detail\":\"Q3 Supplier Invoice\",\"kind\":\"crypto\"},"
                + "{\"event\":\"Client file opened\",\"actor\":\"Prateek Chen\",\"time\":\"09:36:04\",\"detail\":\"Asteron Holdings — KYC\",\"kind\":\"access\"},"
                + "{\"event\":\"External share link created\",\"actor\":\"Elliot Park\",\"time\":\"08:51:42\",\"detail\":\"April portfolio statement\",\"kind\":\"share\"},"
                + "{\"event\":\"Session token issued\",\"actor\":\"Identity service\",\"time\":\"08:16:09\",\"detail\":\"Client portal login\",\"kind\":\"identity\"}],"
                + "\"cryptoExamples\":["
                + "{\"layer\":\"Java service\",\"name\":\"Invoice fingerprint\",\"algorithm\":\"SHA-1\",\"severity\":\"High\",\"detail\":\"Used as a document fingerprint; unsuitable for security-sensitive integrity checks.\",\"output\":\"" + invoiceFingerprint + "\"},"
                + "{\"layer\":\"Java service\",\"name\":\"Stored invoice payload\",\"algorithm\":\"DES/ECB/PKCS5Padding\",\"severity\":\"Critical\",\"detail\":\"Legacy block cipher, ECB mode and a source-coded static key.\",\"output\":\"" + encryptedInvoice + "\"},"
                + "{\"layer\":\"Java service\",\"name\":\"Portal session token\",\"algorithm\":\"java.util.Random\",\"severity\":\"High\",\"detail\":\"Predictable pseudo-random generator used for a security token.\",\"output\":\"" + sessionToken + "\"},"
                + "{\"layer\":\"Java service\",\"name\":\"Development credential\",\"algorithm\":\"hardcoded plaintext\",\"severity\":\"High\",\"detail\":\"Demo credential is embedded directly in source code.\",\"output\":\"" + DEMO_PASSWORD + "\"}]}";
        respond(exchange, 200, json);
    }

    private static String digest(String algorithm, String value) {
        try {
            return hex(MessageDigest.getInstance(algorithm).digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String encryptInvoice(String value) {
        try {
            Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(STATIC_DES_KEY, "DES"));
            return hex(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) out.append(String.format("%02x", b));
        return out.toString();
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "http://localhost:3000");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }
}
