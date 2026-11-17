package com.peymanzibaeifar.tattoohub;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends Activity {
    private static final int FILE_REQ = 41;
    private static final int MIC_REQ = 7;
    private static final String HOME = "https://kasbokarapp.com/tattoohub/";
    private static final String KEY_ALIAS = "tattoohub-session";
    private WebView webView;
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> fileCallback;
    private MediaRecorder recorder;
    private File voiceFile;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("hub", MODE_PRIVATE);
        readToken(getIntent());
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
                pushToken();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        request.deny();
                    }
                });
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
        if (readToken(intent)) pushToken();
    }

    private void pushToken() {
        if (webView == null) return;
        String token = readStoredToken();
        if (token.isEmpty()) return;
        webView.evaluateJavascript("window.hubSignedIn&&window.hubSignedIn(" + org.json.JSONObject.quote(token) + ")", null);
    }

    private boolean readToken(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || data.getQueryParameter("token") == null) return false;
        if (!"tattoohub".equals(data.getScheme()) && !"auth".equals(data.getHost())) return false;
        String token = data.getQueryParameter("token");
        if (token == null || token.isEmpty()) return false;
        storeToken(token);
        return true;
    }

    private void storeToken(String token) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secret());
            byte[] iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(token.getBytes("UTF-8"));
            prefs.edit()
                .putString("token_iv", Base64.encodeToString(iv, Base64.NO_WRAP))
                .putString("token_box", Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .remove("token")
                .apply();
        } catch (Exception error) {
            prefs.edit().putString("token", token).apply();
        }
    }

    private String readStoredToken() {
        String boxed = prefs.getString("token_box", "");
        String iv = prefs.getString("token_iv", "");
        if (boxed != null && !boxed.isEmpty() && iv != null && !iv.isEmpty()) {
            try {
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, secret(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
                return new String(cipher.doFinal(Base64.decode(boxed, Base64.NO_WRAP)), "UTF-8");
            } catch (Exception ignored) {
                return "";
            }
        }
        return prefs.getString("token", "");
    }

    private SecretKey secret() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(KEY_ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(KEY_ALIAS, null);
    }

    private void clearToken() {
        prefs.edit().remove("token").remove("token_box").remove("token_iv").apply();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_REQ || fileCallback == null) return;
        Uri[] result = resultCode == RESULT_OK && data != null && data.getData() != null ? new Uri[] { data.getData() } : null;
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode == MIC_REQ && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED && webView != null) {
            webView.evaluateJavascript("window.hubVoiceReady&&window.hubVoiceReady()", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript("window.hubBack?window.hubBack():false", value -> {
            if (!"true".equals(value)) runOnUiThread(() -> MainActivity.super.onBackPressed());
        });
    }

    private String startRecorder() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            if (!shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO) && prefs.getBoolean("mic_asked", false)) return "settings";
            prefs.edit().putBoolean("mic_asked", true).apply();
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MIC_REQ);
            return "denied";
        }
        try {
            stopRecorder(true);
            voiceFile = new File(getCacheDir(), "voice-" + System.currentTimeMillis() + ".m4a");
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioEncodingBitRate(64000);
            recorder.setAudioSamplingRate(22050);
            recorder.setOutputFile(voiceFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            return "ok";
        } catch (Exception error) {
            stopRecorder(true);
            return "error";
        }
    }

    private void stopRecorder(boolean drop) {
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            try { recorder.release(); } catch (Exception ignored) {}
            recorder = null;
        }
        if (drop && voiceFile != null && voiceFile.exists()) voiceFile.delete();
        if (drop) voiceFile = null;
    }

    private String voiceData() {
        if (voiceFile == null || !voiceFile.exists() || voiceFile.length() < 800) return "";
        try {
            FileInputStream input = new FileInputStream(voiceFile);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) > 0) output.write(buffer, 0, read);
            input.close();
            return "data:audio/mp4;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } catch (Exception error) {
            return "";
        } finally {
            if (voiceFile != null) voiceFile.delete();
            voiceFile = null;
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void googleLogin() {
            runOnUiThread(() -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://kasbokarapp.com/login?next=/tattoohub/enter.html"))));
        }

        @JavascriptInterface
        public String token() {
            return readStoredToken();
        }

        @JavascriptInterface
        public void logout() {
            clearToken();
        }

        @JavascriptInterface
        public String startVoice() {
            final String[] result = new String[] { "error" };
            CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(() -> {
                result[0] = startRecorder();
                latch.countDown();
            });
            try { latch.await(2, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
            return result[0];
        }

        @JavascriptInterface
        public void stopVoice() {
            runOnUiThread(() -> {
                stopRecorder(false);
                String data = voiceData();
                if (webView != null) webView.evaluateJavascript("window.hubVoice&&window.hubVoice(" + org.json.JSONObject.quote(data) + ")", null);
            });
        }

        @JavascriptInterface
        public void cancelVoice() {
            runOnUiThread(() -> stopRecorder(true));
        }
    }
}
