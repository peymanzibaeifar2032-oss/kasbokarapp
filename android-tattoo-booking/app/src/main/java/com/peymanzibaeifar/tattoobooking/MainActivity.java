package com.peymanzibaeifar.tattoobooking;

import android.Manifest;
import android.app.Activity;
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
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
    private static final String HOME = "https://kasbokarapp.com/studio";
    private static final String ADMIN = "https://kasbokarapp.com/studio/admin";
    private static final String CHANNEL = "tattoo-notices";
    private static final int FILE_CHOOSER = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private boolean savingPdf;
    private String pendingPdfName;
    private String pendingPdfHtml;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.web);
        webView.setBackgroundColor(0xFF0B0B0C);

        View ownerChrome = findViewById(R.id.ownerChrome);
        ownerChrome.setVisibility(View.GONE);
        View adminBar = findViewById(R.id.adminBar);
        View homeBar = findViewById(R.id.homeBar);
        adminBar.setOnClickListener(v -> webView.loadUrl(ADMIN));
        homeBar.setOnClickListener(v -> webView.loadUrl(HOME));

        ensureNoticeChannel();
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 2002);
        }

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
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        String ua = settings.getUserAgentString();
        if (ua != null) {
            settings.setUserAgentString(ua + " TattooApp/1.8");
        }

        webView.addJavascriptInterface(new AppBridge(), "AndroidApp");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (keepInApp(uri)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    Toast.makeText(MainActivity.this, "این پیوند باز نشد", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
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
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                            } catch (Exception ignored) {
                                Toast.makeText(MainActivity.this, "این پیوند باز نشد", Toast.LENGTH_SHORT).show();
                            }
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
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(intent, "انتخاب عکس"), FILE_CHOOSER);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(openUrlFromIntent(getIntent()));
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

    private String openUrlFromIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if ("https".equals(data.getScheme()) && data.getHost() != null && data.getHost().endsWith("kasbokarapp.com")) {
                return data.toString();
            }
        }
        if (intent != null && intent.getStringExtra("open") != null) {
            return intent.getStringExtra("open");
        }
        return HOME;
    }

    private boolean keepInApp(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if ("tel".equals(scheme) || "mailto".equals(scheme) || "sms".equals(scheme) || "intent".equals(scheme)) {
            return false;
        }
        String host = uri.getHost() == null ? "" : uri.getHost();
        if (host.endsWith("kasbokarapp.com")) return true;
        if ("calendar.google.com".equals(host)) return false;
        return host.endsWith("google.com")
                || host.endsWith("googleusercontent.com")
                || host.endsWith("gstatic.com")
                || host.endsWith("googleapis.com")
                || host.endsWith("youtube.com")
                || host.endsWith("ytimg.com")
                || host.endsWith("ggpht.com");
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

    public class AppBridge {
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
            runOnUiThread(() -> {
                View bar = findViewById(R.id.ownerChrome);
                if (bar != null) bar.setVisibility(show ? View.VISIBLE : View.GONE);
            });
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
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
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
