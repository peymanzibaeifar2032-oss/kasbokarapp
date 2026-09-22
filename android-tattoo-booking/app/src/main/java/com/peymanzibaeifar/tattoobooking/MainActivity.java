package com.peymanzibaeifar.tattoobooking;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String HOME = "https://kasbokarapp.com/studio";
    private static final String CHANNEL = "tattoo-notices";
    private static final int FILE_CHOOSER = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0B0B0C);
        setContentView(webView);

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
        String ua = settings.getUserAgentString();
        if (ua != null) {
            settings.setUserAgentString(
                    ua.replace("; wv", "").replace(" Version/4.0", "") + " TattooApp/1.1");
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
}
