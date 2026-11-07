package com.peymanzibaeifar.tattoobooking;

import com.peymanzibaeifar.tattoobooking.BuildConfig;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.webkit.JsResult;
import android.webkit.JsPromptResult;
import android.widget.EditText;
import android.util.Base64;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.pdf.PdfDocument;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextDirectionHeuristics;
import android.text.TextPaint;
import android.provider.MediaStore;
import android.view.View;
import android.view.Gravity;
import android.widget.Button;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.webkit.ConsoleMessage;
import android.util.Log;
import androidx.webkit.WebViewAssetLoader;
import android.content.SharedPreferences;
import org.json.JSONObject;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String PROD_HOME = "https://kasbokarapp.com/studio/pocket";
    // Virtual https origin so classic/module scripts + storage work inside WebView.
    private static final String OFFLINE_HOME = "https://appassets.androidplatform.net/assets/pocket/index.html";
    private static final String HOME = BuildConfig.DEBUG ? OFFLINE_HOME : PROD_HOME;
    private static final String TAG = "TattooBookingWV";
    private static final String ADMIN = "https://kasbokarapp.com/studio/admin";
    private static final String LOGIN = "https://kasbokarapp.com/login?next=/studio/admin";
    private static final String LOGOUT = "https://kasbokarapp.com/login?out=1";
    private static final String CHANNEL = "tattoo-notices";
    private static final int FILE_CHOOSER = 1001;
    private static final int POCKET_SAVE_FILE = 1004;
    private byte[] pendingFileBytes;
    private String pendingFileRequest;
    private String pendingFileOrigin;

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> fileCallback;
    private boolean savingPdf;
    private boolean pocketLoginInProgress;
    private boolean clearPocketHistory;
    private Button pocketReturnButton;
    private boolean pocketExportInProgress;
    private String pendingPdfName;
    private String pendingPdfHtml;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.web);
        webView.setBackgroundColor(0xFFFFF9F2);
        // Native control remains available on old website deployments and failed login pages.
        pocketReturnButton = new Button(this);
        pocketReturnButton.setText("بررسی حساب / بازگشت به اپ");
        pocketReturnButton.setVisibility(View.GONE);
        pocketReturnButton.setOnClickListener(v -> finishPocketLogin());
        FrameLayout.LayoutParams returnLayout = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, loginBarHeight(), Gravity.BOTTOM);
        ((FrameLayout) webView.getParent()).addView(pocketReturnButton, returnLayout);
        pocketLoginInProgress = savedInstanceState != null && savedInstanceState.getBoolean("pocketLoginInProgress");
        showPocketReturn(pocketLoginInProgress);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        ensureNoticeChannel();
        // Do not block first paint with a permission dialog (esp. slow emulators).
        // DEBUG APKs skip the runtime prompt; release asks after the first page loads.

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(!BuildConfig.DEBUG);
        settings.setSupportMultipleWindows(!BuildConfig.DEBUG);
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (BuildConfig.DEBUG) {
            // Emulator/TCG WebView is fragile; software layer avoids some GPU renderer traps.
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // Keep assets warm in debug offline shell; avoid wiping every launch.
        settings.setCacheMode(BuildConfig.DEBUG ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_NO_CACHE);
        if (!BuildConfig.DEBUG) {
            webView.clearCache(true);
        }
        String ua = settings.getUserAgentString();
        if (ua != null) {
            settings.setUserAgentString(ua + " TattooApp/1.14.1");
        }

        webView.addJavascriptInterface(new AppBridge(), "AndroidApp");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = assetLoader.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                Uri uri = Uri.parse(url);
                // Existing login/report bridge must never remain exposed on third-party pages.
                if (isTrustedBridgeOrigin(uri)) view.addJavascriptInterface(new AppBridge(), "AndroidApp");
                else view.removeJavascriptInterface("AndroidApp");
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (request.isForMainFrame() && pocketLoginInProgress && isProductionOrigin(uri)
                        && "/studio/pocket".equals(uri.getPath())) {
                    finishPocketLogin();
                    return true;
                }
                if (keepInApp(uri)) {
                    return false;
                }
                openExternalSafely(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                Log.i(TAG, "page finished: " + url);
                if (pocketLoginInProgress && isProductionOrigin(Uri.parse(url))
                        && "/studio/pocket".equals(Uri.parse(url).getPath())) {
                    finishPocketLogin();
                    return;
                }
                if (clearPocketHistory && isOfflinePage()) {
                    clearPocketHistory = false;
                    view.clearHistory();
                }
                maybeAskNotifications();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "webview error " + errorCode + " " + description + " @ " + failingUrl);
                super.onReceivedError(view, errorCode, description, failingUrl);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                boolean crashed = detail != null && detail.didCrash();
                Log.e(TAG, "render process gone crashed=" + crashed);
                if (view != null) {
                    try {
                        view.loadUrl(HOME);
                    } catch (Exception e) {
                        Log.e(TAG, "reload after render gone failed", e);
                    }
                }
                // Prevent process-wide FATAL when Chromium renderer dies (common on slow emulators).
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                if (!isTrustedBridgeOrigin(Uri.parse(url))) { result.cancel(); return true; }
                EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue == null ? "" : defaultValue);
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setView(input)
                    .setPositiveButton("ثبت", (dialog, which) -> result.confirm(input.getText().toString()))
                    .setNegativeButton("لغو", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (!isTrustedBridgeOrigin(Uri.parse(url))) { result.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("تأیید", (dialog, which) -> result.confirm())
                    .setNegativeButton("لغو", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.i(TAG, consoleMessage.messageLevel() + ":" + consoleMessage.message()
                        + " @" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
                return true;
            }
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView extra = new WebView(view.getContext());
                extra.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (keepInApp(uri)) {
                            view.loadUrl(uri.toString());
                        } else {
                            openExternalSafely(uri);
                        }
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(extra);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(intent, "انتخاب عکس یا فایل"), FILE_CHOOSER);
                } catch (Exception e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    return true;
                }
                return true;
            }
        });

        if (savedInstanceState == null) {
            String startUrl = openUrlFromIntent(getIntent());
            Log.i(TAG, "loadUrl " + startUrl + " debug=" + BuildConfig.DEBUG);
            webView.loadUrl(startUrl);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String url = openUrlFromIntent(intent);
        if (webView != null && url != null) {
            webView.loadUrl(url);
        }
    }


    private boolean askedNotifications;

    private void maybeAskNotifications() {
        if (askedNotifications || BuildConfig.DEBUG) {
            return;
        }
        if (Build.VERSION.SDK_INT < 33) {
            return;
        }
        askedNotifications = true;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 2002);
        }
    }

    private String openUrlFromIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if ("https".equals(data.getScheme()) && data.getHost() != null && isProductionOrigin(data)) {
                return data.toString();
            }
        }
        if (intent != null && intent.getStringExtra("open") != null) {
            return intent.getStringExtra("open");
        }
        return HOME;
    }

    private int loginBarHeight() {
        return (int) (56 * getResources().getDisplayMetrics().density);
    }

    private void showPocketReturn(boolean show) {
        pocketReturnButton.setVisibility(show ? View.VISIBLE : View.GONE);
        FrameLayout.LayoutParams layout = (FrameLayout.LayoutParams) webView.getLayoutParams();
        layout.bottomMargin = show ? loginBarHeight() : 0;
        webView.setLayoutParams(layout);
    }

    private void finishPocketLogin() {
        // A return is NOT authentication. The fresh offline document probes the server again.
        pocketLoginInProgress = false;
        showPocketReturn(false);
        CookieManager.getInstance().flush();
        clearPocketHistory = true;
        webView.loadUrl(OFFLINE_HOME);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isOfflinePage()) webView.evaluateJavascript(
                "window.dispatchEvent(new Event('pocket-account-refresh'));", null);
    }

    private boolean isProductionOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && (uri.getPort() == -1 || uri.getPort() == 443)
                && ("kasbokarapp.com".equals(uri.getHost()) || "www.kasbokarapp.com".equals(uri.getHost()));
    }

    private boolean isOfflinePage() {
        return webView != null && OFFLINE_HOME.equals(webView.getUrl());
    }

    private boolean isTrustedBridgeOrigin(Uri uri) {
        return isProductionOrigin(uri) || ("https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getPath() != null
                && uri.getPath().startsWith("/assets/pocket/"));
    }

    private boolean keepInApp(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if ("file".equals(scheme)) {
            return true;
        }
        if ("appassets.androidplatform.net".equals(uri.getHost())) {
            return true;
        }
        if ("tel".equals(scheme) || "mailto".equals(scheme) || "sms".equals(scheme) || "smsto".equals(scheme)
                || "intent".equals(scheme)) {
            return false; // handled (or refused) by openExternalSafely
        }
        String host = uri.getHost() == null ? "" : uri.getHost();
        if (isProductionOrigin(uri)) {
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (path.startsWith("/studio/admin")) return false;
            if ("/login".equals(path) || path.startsWith("/login/")) {
                String next = uri.getQueryParameter("next");
                if ("1".equals(uri.getQueryParameter("out"))) return false;
                if (next != null && next.contains("/studio/admin")) return false;
            }
            return true;
        }
        if ("calendar.google.com".equals(host)) return false;
        if (host.equals("pin.it") || host.endsWith("pinterest.com") || host.endsWith("pinimg.com")) return true;
        return host.endsWith("google.com")
                || host.endsWith("googleusercontent.com")
                || host.endsWith("gstatic.com")
                || host.endsWith("googleapis.com")
                || host.endsWith("youtube.com")
                || host.endsWith("ytimg.com")
                || host.endsWith("ggpht.com");
    }

    /**
     * Only dial/SMS/mail composers and plain https pages may leave the WebView. intent:, javascript:,
     * content:, file: and every other scheme are refused, so page links cannot launch arbitrary components.
     * tel/sms open the phone's own dialer/messaging app; the user still presses call/send there.
     */
    private void openExternalSafely(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
        Intent intent;
        if ("tel".equals(scheme)) {
            intent = new Intent(Intent.ACTION_DIAL, uri);
        } else if ("sms".equals(scheme) || "smsto".equals(scheme) || "mailto".equals(scheme)) {
            intent = new Intent(Intent.ACTION_SENDTO, uri);
            String body = null;
            try { body = uri.getQueryParameter("body"); } catch (Exception ignored) { }
            if (body == null) {
                String ssp = uri.getSchemeSpecificPart();
                int q = ssp == null ? -1 : ssp.indexOf("?body=");
                if (q >= 0) body = ssp.substring(q + 6);
                if (q >= 0) intent.setData(Uri.parse(scheme + ":" + ssp.substring(0, q)));
            } else {
                String ssp = uri.getSchemeSpecificPart();
                int q = ssp == null ? -1 : ssp.indexOf('?');
                if (q >= 0) intent.setData(Uri.parse(scheme + ":" + ssp.substring(0, q)));
            }
            if (body != null && !"mailto".equals(scheme)) intent.putExtra("sms_body", body);
        } else if ("https".equals(scheme) && uri.getHost() != null) {
            intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
        } else {
            Toast.makeText(this, "این نوع پیوند مجاز نیست", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            startActivity(intent);
        } catch (Exception ignored) {
            Toast.makeText(this, "این پیوند باز نشد", Toast.LENGTH_SHORT).show();
        }
    }

    private void openOutside(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
            Toast.makeText(this, "مرورگر باز نشد", Toast.LENGTH_SHORT).show();
        }
    }

    private void signOutOfApp() {
        CookieManager cookies = CookieManager.getInstance();
        cookies.removeAllCookies(ok -> cookies.flush());
        if (webView != null) webView.loadUrl(HOME);
        openOutside(LOGOUT);
    }

    private void ensureNoticeChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL,
                "نوبت تاتو",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("تأیید، پیام و وضعیت نوبت تاتو");
        nm.createNotificationChannel(channel);
    }

    private void postNotice(String title, String body) {
        ensureNoticeChannel();
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("open", "https://kasbokarapp.com/studio/status");
        PendingIntent tap = PendingIntent.getActivity(
                this,
                11,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title == null || title.isEmpty() ? "نوبت تاتو" : title)
                .setContentText(body == null ? "" : body)
                .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
                .setAutoCancel(true)
                .setContentIntent(tap);
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify((int) (System.currentTimeMillis() & 0xfffffff), builder.build());
    }

    private interface LicenseRequest { PocketExportClient.Result run() throws Exception; }

    private void licenseCall(String requestId, String name, LicenseRequest request) {
        if (requestId == null || !requestId.matches("[a-zA-Z0-9-]{1,80}")) return;
        runOnUiThread(() -> {
            if (!isOfflinePage()) return;
            new Thread(() -> {
                try {
                    PocketExportClient.Result result = request.run();
                    runOnUiThread(() -> deliverPocketExport(requestId, result.status, result.body, null));
                } catch (IllegalArgumentException bad) {
                    runOnUiThread(() -> deliverPocketExport(requestId, 400, "{\"code\":\"bad_request\"}", null));
                } catch (Exception error) {
                    runOnUiThread(() -> deliverPocketExport(requestId, 0, null, "NETWORK_OR_SERVER_ERROR"));
                }
            }, name).start();
        });
    }

    private void deliverPocketExport(String requestId, int status, String body, String error) {
        if (!isOfflinePage()) return; // Don't deliver private data into a different document.
        try {
            JSONObject result = new JSONObject();
            result.put("requestId", requestId);
            result.put("status", status);
            if (body != null) result.put("data", new JSONObject(body));
            if (error != null) result.put("error", error);
            String script = "window.dispatchEvent(new CustomEvent('pocket-export-result',{detail:"
                    + result.toString() + "}));";
            webView.evaluateJavascript(script, null);
        } catch (Exception ignored) {
            if (body != null) deliverPocketExport(requestId, 0, null, "SERVER_INVALID_JSON");
        }
    }

    private boolean isPocketDocument() {
        if (webView == null) return false;
        if (isOfflinePage()) return true;
        Uri uri = Uri.parse(webView.getUrl() == null ? "" : webView.getUrl());
        return isProductionOrigin(uri) && "/studio/pocket".equals(uri.getPath());
    }

    private void fileSaveResult(String requestId, boolean ok, boolean cancelled, String origin) {
        if (webView == null || !isPocketDocument() || !origin.equals(webView.getUrl())) return;
        try {
            JSONObject result = new JSONObject();
            result.put("requestId", requestId); result.put("ok", ok); result.put("cancelled", cancelled);
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('pocket-file-result',{detail:" + result + "}));", null);
        } catch (Exception ignored) { }
    }

    private void beginPocketFile(String requestId, String filename, String mime, String base64) {
        if (!isPocketDocument() || requestId == null || !requestId.matches("[a-zA-Z0-9-]{1,80}")) return;
        String origin = webView.getUrl();
        if (pendingFileBytes != null || base64 == null || base64.length() > 48 * 1024 * 1024
                || !("application/json".equals(mime) || "application/pdf".equals(mime))) {
            fileSaveResult(requestId, false, false, origin); return;
        }
        try {
            byte[] bytes = Base64.decode(base64, Base64.NO_WRAP);
            if (bytes.length == 0 || bytes.length > 36 * 1024 * 1024) throw new IOException("size");
            String name = filename == null ? "kasbokar-export" : filename.replaceAll("[^a-zA-Z0-9._-]", "-");
            if (name.length() > 100) name = name.substring(0, 100);
            String ext = "application/pdf".equals(mime) ? ".pdf" : ".json";
            if (!name.endsWith(ext)) name += ext;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType(mime); intent.putExtra(Intent.EXTRA_TITLE, name);
            pendingFileBytes = bytes; pendingFileRequest = requestId; pendingFileOrigin = origin;
            startActivityForResult(intent, POCKET_SAVE_FILE);
        } catch (Exception error) {
            pendingFileBytes = null; pendingFileRequest = null; pendingFileOrigin = null;
            fileSaveResult(requestId, false, false, origin);
        }
    }

    public class AppBridge {
        @JavascriptInterface
        public void savePocketFile(String requestId, String filename, String mime, String base64) {
            runOnUiThread(() -> beginPocketFile(requestId, filename, mime, base64));
        }

        @JavascriptInterface
        public void openPocketLogin() {
            runOnUiThread(() -> {
                if (!isOfflinePage()) return;
                pocketLoginInProgress = true;
                showPocketReturn(true);
                webView.loadUrl("https://kasbokarapp.com/login?next=/studio/pocket");
            });
        }

        @JavascriptInterface
        public void downloadPocketBookings(String requestId) {
            if (requestId == null || !requestId.matches("[a-zA-Z0-9-]{1,80}")) return;
            runOnUiThread(() -> {
                if (!isOfflinePage()) return;
                if (pocketExportInProgress) {
                    deliverPocketExport(requestId, 0, null, "SYNC_BUSY");
                    return;
                }
                pocketExportInProgress = true;
                // Use only this app's WebView session, set by the ordinary website login.
                // Cookies never cross the JS bridge, enter logs, or get sent to another host.
                final String cookie = CookieManager.getInstance().getCookie(PocketExportClient.ENDPOINT);
                new Thread(() -> {
                    try {
                        PocketExportClient.Result result = PocketExportClient.download(cookie);
                        runOnUiThread(() -> {
                            pocketExportInProgress = false;
                            deliverPocketExport(requestId, result.status, result.body, null);
                        });
                    } catch (Exception error) {
                        runOnUiThread(() -> {
                            pocketExportInProgress = false;
                            deliverPocketExport(requestId, 0, null, "NETWORK_OR_SERVER_ERROR");
                        });
                    }
                }, "pocket-export").start();
            });
        }

        @JavascriptInterface
        public void verifyPocketAccount(String requestId) {
            if (requestId == null || !requestId.matches("[a-zA-Z0-9-]{1,80}")) return;
            runOnUiThread(() -> {
                if (!isOfflinePage()) return;
                final String cookie = CookieManager.getInstance().getCookie(PocketExportClient.ENDPOINT);
                if (cookie == null || cookie.isEmpty()) {
                    // Not signed in on the website inside this app: no network call, owner UI stays hidden.
                    deliverPocketExport(requestId, 401, "{}", null);
                    return;
                }
                new Thread(() -> {
                    try {
                        PocketExportClient.Result result = PocketExportClient.send(cookie, PocketExportClient.Action.ACCESS);
                        runOnUiThread(() -> deliverPocketExport(requestId, result.status, result.body, null));
                    } catch (Exception error) {
                        runOnUiThread(() -> deliverPocketExport(requestId, 0, null, "NETWORK_OR_SERVER_ERROR"));
                    }
                }, "pocket-access").start();
            });
        }

        @JavascriptInterface
        public void activatePocketLicense(String requestId, String code, String device) {
            licenseCall(requestId, "license-activate", () -> PocketExportClient.activate(code, device));
        }

        @JavascriptInterface
        public void refreshPocketLicense(String requestId, String token, String device) {
            licenseCall(requestId, "license-refresh", () -> PocketExportClient.refresh(token, device));
        }

        @JavascriptInterface
        public void selfPocketLicense(String requestId, String device) {
            if (requestId == null || !requestId.matches("[a-zA-Z0-9-]{1,80}")) return;
            runOnUiThread(() -> {
                if (!isOfflinePage()) return;
                final String cookie = CookieManager.getInstance().getCookie(PocketExportClient.ENDPOINT);
                if (cookie == null || cookie.isEmpty()) { deliverPocketExport(requestId, 401, "{}", null); return; }
                licenseCall(requestId, "license-self", () -> PocketExportClient.selfLicense(cookie, device));
            });
        }

        @JavascriptInterface
        public boolean noticesReady() {
            return true;
        }

        @JavascriptInterface
        public void showNotice(String title, String body) {
            runOnUiThread(() -> postNotice(title, body));
        }

        @JavascriptInterface
        public void scheduleNotice(String id, String title, String body, double whenMs) {
            runOnUiThread(() -> schedulePrepNotice(id, title, body, (long) whenMs));
        }

        @JavascriptInterface
        public void setOwnerChrome(boolean show) {
            if (show) return;
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.isEmpty()) return;
            runOnUiThread(() -> openOutside(url));
        }

        @JavascriptInterface
        public void saveReport(String filename, String html) {
            runOnUiThread(() -> beginSaveReport(filename, html));
        }

        @JavascriptInterface
        public void saveLogin(String email, String password) {
            if (email == null || password == null || password.length() < 8) return;
            SharedPreferences prefs = logins();
            try {
                JSONObject map = new JSONObject(prefs.getString("map", "{}"));
                putLoginKeys(map, email, password);
                prefs.edit()
                        .putString("map", map.toString())
                        .putString("last", email.trim().toLowerCase())
                        .apply();
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String savedLogin(String email) {
            if (email == null) return "";
            try {
                JSONObject map = new JSONObject(logins().getString("map", "{}"));
                return lookupLogin(map, email);
            } catch (Exception ignored) {
                return "";
            }
        }

        @JavascriptInterface
        public String lastLogin() {
            try {
                SharedPreferences prefs = logins();
                String email = prefs.getString("last", "");
                if (email == null || email.isEmpty()) return "";
                JSONObject map = new JSONObject(prefs.getString("map", "{}"));
                String password = lookupLogin(map, email);
                if (password.isEmpty()) return "";
                JSONObject out = new JSONObject();
                out.put("email", email);
                out.put("password", password);
                return out.toString();
            } catch (Exception ignored) {
                return "";
            }
        }
    }

    private SharedPreferences logins() {
        return getSharedPreferences("tattoo_device_logins", MODE_PRIVATE);
    }

    private void putLoginKeys(JSONObject map, String email, String password) throws Exception {
        String raw = email.trim().toLowerCase();
        if (!raw.contains("@")) return;
        map.put(raw, password);
        int at = raw.lastIndexOf('@');
        String domain = raw.substring(at + 1);
        if ("googlemail.com".equals(domain)) domain = "gmail.com";
        if ("gmail.com".equals(domain)) {
            String local = raw.substring(0, at).replace(".", "").split("\\+")[0];
            if (!local.isEmpty()) map.put(local + "@gmail.com", password);
        }
    }

    private String lookupLogin(JSONObject map, String email) {
        String raw = email.trim().toLowerCase();
        String found = map.optString(raw, "");
        if (!found.isEmpty()) return found;
        int at = raw.lastIndexOf('@');
        if (at <= 0) return "";
        String domain = raw.substring(at + 1);
        if ("googlemail.com".equals(domain)) domain = "gmail.com";
        if (!"gmail.com".equals(domain)) return "";
        String local = raw.substring(0, at).replace(".", "").split("\\+")[0];
        return map.optString(local + "@gmail.com", "");
    }

    private void schedulePrepNotice(String id, String title, String body, long whenMs) {
        if (whenMs <= System.currentTimeMillis()) return;
        AlarmManager alarms = (AlarmManager) getSystemService(ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(this, NoticeReceiver.class);
        intent.putExtra("title", title == null ? "نوبت تاتو" : title);
        intent.putExtra("body", body == null ? "" : body);
        int request = id == null ? (int) (whenMs & 0xfffffff) : id.hashCode();
        PendingIntent pending = PendingIntent.getBroadcast(
                this,
                request,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= 23) {
            try {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pending);
            } catch (SecurityException ignored) {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pending);
            }
        } else {
            alarms.setExact(AlarmManager.RTC_WAKEUP, whenMs, pending);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == POCKET_SAVE_FILE) {
            final byte[] bytes = pendingFileBytes;
            final String id = pendingFileRequest;
            final String origin = pendingFileOrigin;
            pendingFileBytes = null; pendingFileRequest = null; pendingFileOrigin = null;
            if (id == null || origin == null) return;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) {
                fileSaveResult(id, false, true, origin); return;
            }
            final Uri destination = data.getData();
            if (!"content".equals(destination.getScheme())) { fileSaveResult(id, false, false, origin); return; }
            new Thread(() -> {
                boolean ok = false;
                try (OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
                    if (output == null) throw new IOException("stream");
                    output.write(bytes); output.flush(); ok = true;
                } catch (Exception ignored) { }
                final boolean saved = ok;
                runOnUiThread(() -> fileSaveResult(id, saved, false, origin));
            }, "pocket-file-save").start();
            return;
        }
        if (requestCode != FILE_CHOOSER) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        Uri[] uris = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                uris = new Uri[count];
                for (int i = 0; i < count; i++) {
                    uris[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                uris = new Uri[] { data.getData() };
            }
        }
        if (fileCallback != null) {
            fileCallback.onReceiveValue(uris);
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (pocketLoginInProgress) { finishPocketLogin(); return; }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean("pocketLoginInProgress", pocketLoginInProgress);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    private void beginSaveReport(String filename, String html) {
        if (html == null || html.trim().isEmpty()) {
            Toast.makeText(this, "لیستی برای ذخیره نیست", Toast.LENGTH_LONG).show();
            return;
        }
        if (Build.VERSION.SDK_INT < 29
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingPdfName = filename;
            pendingPdfHtml = html;
            requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, 2003);
            return;
        }
        renderReportPdf(filename, html);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == 2003) {
            String html = pendingPdfHtml;
            String name = pendingPdfName;
            pendingPdfHtml = null;
            pendingPdfName = null;
            if (html != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                renderReportPdf(name, html);
            } else {
                Toast.makeText(this, "بدون اجازه ذخیره، PDF در دانلود نمی‌آید", Toast.LENGTH_LONG).show();
            }
            return;
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    private void renderReportPdf(String filename, String html) {
        if (savingPdf) {
            Toast.makeText(this, "PDF قبلی هنوز در حال ذخیره است", Toast.LENGTH_SHORT).show();
            return;
        }
        savingPdf = true;
        try {
            File dir = new File(getCacheDir(), "reports");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("cache");
            File out = new File(dir, "report.pdf");
            writeTextPdf(htmlToText(html), out);
            Uri uri = copyToDownloads(out, safePdfName(filename));
            Toast.makeText(this, "لیست در پوشه دانلود گوشی ذخیره شد", Toast.LENGTH_LONG).show();
            if (uri != null && !"file".equals(uri.getScheme())) {
                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(uri, "application/pdf");
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(Intent.createChooser(viewIntent, "باز کردن PDF"));
                } catch (Exception ignored) {
                    /* file is already in Downloads */
                }
            }
        } catch (Exception e) {
            Toast.makeText(this, "ذخیره PDF نشد", Toast.LENGTH_LONG).show();
        } finally {
            savingPdf = false;
        }
    }

    private static String htmlToText(String html) {
        String text = html
                .replaceAll("(?is)<style[^>]*>.*?</style>", "")
                .replaceAll("(?is)<script[^>]*>.*?</script>", "")
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(p|h1|h2|div)>", "\n")
                .replaceAll("(?i)</article>", "\n\n")
                .replaceAll("(?i)<[^>]+>", "");
        text = text.replace("\u0026nbsp;", " ")
                .replace("\u0026amp;", "\u0026")
                .replace("\u0026lt;", "<")
                .replace("\u0026gt;", ">")
                .replace("\u0026quot;", "\"")
                .replace("\u0026#39;", "'");
        return text.replace("\r", "").replaceAll("[ \\t]+\\n", "\n").replaceAll("[ \\t]{2,}", " ").replaceAll("\n{3,}", "\n\n").trim();
    }

    private static void writeTextPdf(String text, File out) throws IOException {
        final int pageWidth = 595;
        final int pageHeight = 842;
        final int margin = 36;
        TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.BLACK);
        paint.setTextSize(12f);
        PdfDocument pdf = new PdfDocument();
        int pageNumber = 1;
        PdfDocument.Page page = startPdfPage(pdf, pageNumber, pageWidth, pageHeight);
        Canvas canvas = page.getCanvas();
        int y = margin;
        String[] lines = text.split("\n", -1);
        for (String line : lines) {
            String row = line.trim();
            if (row.isEmpty()) {
                y += 10;
                if (y > pageHeight - margin) {
                    pdf.finishPage(page);
                    pageNumber++;
                    page = startPdfPage(pdf, pageNumber, pageWidth, pageHeight);
                    canvas = page.getCanvas();
                    y = margin;
                }
                continue;
            }
            StaticLayout layout = StaticLayout.Builder.obtain(row, 0, row.length(), paint, pageWidth - margin * 2)
                    .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                    .setTextDirection(TextDirectionHeuristics.RTL)
                    .setIncludePad(false)
                    .build();
            if (y + layout.getHeight() > pageHeight - margin) {
                pdf.finishPage(page);
                pageNumber++;
                page = startPdfPage(pdf, pageNumber, pageWidth, pageHeight);
                canvas = page.getCanvas();
                y = margin;
            }
            canvas.save();
            canvas.translate(margin, y);
            layout.draw(canvas);
            canvas.restore();
            y += layout.getHeight() + 6;
        }
        pdf.finishPage(page);
        try (OutputStream os = new FileOutputStream(out)) {
            pdf.writeTo(os);
        } finally {
            pdf.close();
        }
    }

    private static PdfDocument.Page startPdfPage(PdfDocument pdf, int number, int width, int height) {
        PdfDocument.PageInfo info = new PdfDocument.PageInfo.Builder(width, height, number).create();
        return pdf.startPage(info);
    }

    private Uri copyToDownloads(File cacheFile, String displayName) throws IOException {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, displayName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("downloads");
            try (OutputStream os = getContentResolver().openOutputStream(uri);
                 InputStream in = new FileInputStream(cacheFile)) {
                if (os == null) throw new IOException("stream");
                copyStream(in, os);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, values, null, null);
            return uri;
        }
        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloads.exists() && !downloads.mkdirs()) throw new IOException("downloads");
        File dest = uniqueFile(downloads, displayName);
        try (InputStream in = new FileInputStream(cacheFile);
             OutputStream os = new FileOutputStream(dest)) {
            copyStream(in, os);
        }
        return Uri.fromFile(dest);
    }

    private static void copyStream(InputStream in, OutputStream os) throws IOException {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) {
            os.write(buf, 0, n);
        }
    }

    private static File uniqueFile(File dir, String name) {
        File dest = new File(dir, name);
        if (!dest.exists()) return dest;
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int i = 2; i < 50; i++) {
            File next = new File(dir, base + "-" + i + ext);
            if (!next.exists()) return next;
        }
        return dest;
    }

    private static String safePdfName(String filename) {
        String name = filename == null ? "" : filename.trim().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-");
        if (name.isEmpty()) name = "list-moshtari.pdf";
        if (!name.toLowerCase().endsWith(".pdf")) name = name + ".pdf";
        if (name.length() > 80) name = name.substring(0, 76) + ".pdf";
        return name;
    }
}
