package com.peymanzibaeifar.tattoohub;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int FILE_REQ = 41;
    private static final String HOME = "https://kasbokarapp.com/tattoohub/";
    private WebView webView;
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("hub", MODE_PRIVATE);
        readToken(getIntent());
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, 7);
        }
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new Bridge(), "AndroidHub");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                String token = prefs.getString("token", "");
                if (token != null && !token.isEmpty()) {
                    view.evaluateJavascript("window.hubSignedIn&&window.hubSignedIn(" + JSONObject.quote(token) + ")", null);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_REQ);
                } catch (Exception ignored) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        webView.loadUrl(HOME);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (readToken(intent) && webView != null) webView.loadUrl(HOME);
    }

    private boolean readToken(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"tattoohub".equals(data.getScheme())) return false;
        String token = data.getQueryParameter("token");
        if (token == null || token.isEmpty()) return false;
        prefs.edit().putString("token", token).apply();
        return true;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_REQ || fileCallback == null) return;
        Uri[] result = resultCode == RESULT_OK && data != null && data.getData() != null ? new Uri[] { data.getData() } : null;
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private class Bridge {
        @JavascriptInterface
        public void googleLogin() {
            runOnUiThread(() -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://kasbokarapp.com/login?next=/tattoohub/enter.html"))));
        }

        @JavascriptInterface
        public String token() {
            return prefs.getString("token", "");
        }
    }
}
