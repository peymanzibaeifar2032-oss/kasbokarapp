package com.peymanzibaeifar.tattoobooking;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Read-only, single-destination transport. Never accepts a URL, action or body from JS. */
public final class PocketExportClient {
    public static final String ENDPOINT = "https://kasbokarapp.com/api/save";
    private static final int MAX_BYTES = 4 * 1024 * 1024;

    public static final class Result {
        public final int status;
        public final String body;
        Result(int status, String body) { this.status = status; this.body = body; }
    }

    /** The only two server actions this client can ever send. Both are read-only and session-guarded server-side. */
    public enum Action {
        EXPORT("{\"type\":\"studioPocketExport\",\"payload\":{}}"),
        ACCESS("{\"type\":\"studioPocketAccess\",\"payload\":{}}");
        final String body;
        Action(String body) { this.body = body; }
    }

    public static final String LICENSE_ENDPOINT = "https://kasbokarapp.com/api/pocket-license";
    private static final java.util.regex.Pattern DEVICE = java.util.regex.Pattern.compile("^[a-f0-9]{64}$");
    private static final java.util.regex.Pattern CODE = java.util.regex.Pattern.compile("^[0-9A-Z]{5}(-[0-9A-Z]{5}){3}$");
    private static final java.util.regex.Pattern TOKEN = java.util.regex.Pattern.compile("^[A-Za-z0-9_-]{10,3500}\\.[A-Za-z0-9_-]{40,200}$");

    public static Result download(String cookie) throws Exception {
        return send(cookie, Action.EXPORT);
    }

    public static Result send(String cookie, Action action) throws Exception {
        // Both actions are read-only, so one retry after a dropped/slow connection is safe on weak mobile data.
        try {
            return post(ENDPOINT, cookie, action.body);
        } catch (java.net.SocketTimeoutException | java.net.UnknownHostException
                 | javax.net.ssl.SSLException | java.net.SocketException first) {
            Thread.sleep(1500);
            return post(ENDPOINT, cookie, action.body);
        }
    }

    /** Owner's self license: session-guarded server action, payload is only the validated device id. */
    public static Result selfLicense(String cookie, String device) throws Exception {
        if (device == null || !DEVICE.matcher(device).matches()) throw new IllegalArgumentException("BAD_DEVICE");
        return post(ENDPOINT, cookie, "{\"type\":\"pocketLicenseSelf\",\"payload\":{\"device\":\"" + device + "\"}}");
    }

    /** Cookie-less activation with an owner-issued code. Fixed endpoint; values validated before use. */
    public static Result activate(String code, String device) throws Exception {
        if (code == null || !CODE.matcher(code).matches() || device == null || !DEVICE.matcher(device).matches()) throw new IllegalArgumentException("BAD_INPUT");
        org.json.JSONObject body = new org.json.JSONObject();
        body.put("op", "activate"); body.put("code", code); body.put("device", device); body.put("label", android.os.Build.MODEL == null ? "Android" : android.os.Build.MODEL);
        return post(LICENSE_ENDPOINT, null, body.toString());
    }

    /** Cookie-less refresh of a signed license token. */
    public static Result refresh(String token, String device) throws Exception {
        if (token == null || !TOKEN.matcher(token).matches() || device == null || !DEVICE.matcher(device).matches()) throw new IllegalArgumentException("BAD_INPUT");
        org.json.JSONObject body = new org.json.JSONObject();
        body.put("op", "refresh"); body.put("token", token); body.put("device", device);
        return post(LICENSE_ENDPOINT, null, body.toString());
    }

    private static Result post(String endpoint, String cookie, String bodyText) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        try {
            connection.setInstanceFollowRedirects(false); // Never forward a session to a redirect target.
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(25000);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Cache-Control", "no-store");
            if (cookie != null && !cookie.isEmpty()) connection.setRequestProperty("Cookie", cookie);
            connection.setDoOutput(true);
            byte[] request = bodyText.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(request.length);
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(request); }
            int status = connection.getResponseCode();
            String contentType = connection.getContentType();
            if (status >= 300 && status < 400) throw new java.io.IOException("SERVER_REDIRECT");
            if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).contains("application/json")) {
                throw new java.io.IOException("SERVER_NOT_JSON_HTTP_" + status);
            }
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                if (input != null) {
                    byte[] buffer = new byte[8192];
                    int n;
                    while ((n = input.read(buffer)) != -1) {
                        if (output.size() + n > MAX_BYTES) throw new java.io.IOException("RESPONSE_TOO_LARGE");
                        output.write(buffer, 0, n);
                    }
                }
                // Some Android/JDK stacks suppress the body for a streaming POST 401.
                String body = output.toString("UTF-8");
                return new Result(status, body.trim().isEmpty() ? "{}" : body);
            }
        } finally { connection.disconnect(); }
    }
}
