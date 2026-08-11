package com.jumadeung.familymemory;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class MainActivity extends AppCompatActivity {
    private static final int MAX_BRIDGE_BYTES = 24 * 1024 * 1024;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> webFileCallback;
    private Uri pendingCameraUri;
    private PermissionRequest pendingWebPermission;

    private final ActivityResultLauncher<Intent> pickerLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(), this::handlePickerResult);
    private final ActivityResultLauncher<Intent> cameraLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(), this::handleCameraResult);
    private final ActivityResultLauncher<String[]> permissionLauncher = registerForActivityResult(
        new ActivityResultContracts.RequestMultiplePermissions(), this::handlePermissionResult);

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        configureWebView();
        handleDeepLink(getIntent());
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        webView = findViewById(R.id.webview);
        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " JumadeungAndroid/1.0");
        webView.addJavascriptInterface(new Bridge(), "JumadeungAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("jumadeung".equals(uri.getScheme())) { dispatchDeepLink(uri.toString()); return true; }
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
                    String appHost = Uri.parse(BuildConfig.WEB_APP_URL).getHost();
                    if (appHost != null && appHost.equals(uri.getHost())) return false;
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                }
                return false;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) view.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (webFileCallback != null) webFileCallback.onReceiveValue(null);
                webFileCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                pickerLauncher.launch(intent);
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                pendingWebPermission = request;
                List<String> permissions = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) permissions.add(Manifest.permission.CAMERA);
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) permissions.add(Manifest.permission.RECORD_AUDIO);
                }
                if (permissions.isEmpty()) request.deny();
                else permissionLauncher.launch(permissions.toArray(new String[0]));
            }
        });
        webView.loadUrl(BuildConfig.WEB_APP_URL);
    }

    private final class Bridge {
        @JavascriptInterface public void postMessage(String raw) {
            runOnUiThread(() -> {
                try {
                    JSONObject root = new JSONObject(raw);
                    String action = root.optString("action");
                    JSONObject payload = root.optJSONObject("payload");
                    if (payload == null) payload = new JSONObject();
                    switch (action) {
                        case "pickMedia" -> pickMedia(payload.optBoolean("allowVideo", true), payload.optBoolean("multiple", true));
                        case "takePhoto" -> takePhoto();
                        case "shareText" -> shareText(payload.optString("title", "주마등"), payload.optString("text"), payload.optString("url"));
                        case "shareData", "shareFile" -> shareData(payload.optString("dataUrl"), payload.optString("name", "jumadeung-export.png"), payload.optString("mime", "image/png"));
                        default -> sendResult(false, "지원하지 않는 작업: " + action);
                    }
                } catch (Exception error) {
                    sendResult(false, error.getMessage());
                }
            });
        }
    }

    private void pickMedia(boolean allowVideo, boolean multiple) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(allowVideo ? "*/*" : "image/*");
        if (allowVideo) intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        pickerLauncher.launch(intent);
    }

    private void takePhoto() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(new String[]{Manifest.permission.CAMERA});
            sendResult(false, "카메라 권한을 허용한 뒤 촬영 버튼을 다시 눌러주세요.");
            return;
        }
        try {
            File directory = new File(getCacheDir(), "camera");
            if (!directory.exists() && !directory.mkdirs()) throw new IOException("카메라 캐시를 만들 수 없습니다.");
            File file = File.createTempFile("jm-camera-", ".jpg", directory);
            pendingCameraUri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            cameraLauncher.launch(intent);
        } catch (IOException error) {
            sendResult(false, error.getMessage());
        }
    }

    private void shareText(String title, String text, String url) {
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, title);
        send.putExtra(Intent.EXTRA_TEXT, (text == null ? "" : text) + (url == null || url.isBlank() ? "" : "\n" + url));
        startActivity(Intent.createChooser(send, title));
    }

    private void shareData(String dataUrl, String name, String mime) {
        try {
            byte[] bytes = decodeDataUrl(dataUrl);
            File directory = new File(getCacheDir(), "shared");
            if (!directory.exists() && !directory.mkdirs()) throw new IOException("공유 캐시를 만들 수 없습니다.");
            File file = new File(directory, sanitizeName(name));
            try (FileOutputStream output = new FileOutputStream(file)) { output.write(bytes); }
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent send = new Intent(Intent.ACTION_SEND).setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(send, name));
        } catch (Exception error) {
            sendResult(false, error.getMessage());
        }
    }

    private void handlePickerResult(ActivityResult result) {
        if (webFileCallback != null) {
            Uri[] parsed = result.getResultCode() == Activity.RESULT_OK
                ? WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData()) : null;
            webFileCallback.onReceiveValue(parsed);
            webFileCallback = null;
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) return;
        List<Uri> uris = new ArrayList<>();
        ClipData clip = result.getData().getClipData();
        if (clip != null) for (int i = 0; i < clip.getItemCount(); i++) uris.add(clip.getItemAt(i).getUri());
        else if (result.getData().getData() != null) uris.add(result.getData().getData());
        sendMedia(uris);
    }

    private void handleCameraResult(ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && pendingCameraUri != null) sendMedia(List.of(pendingCameraUri));
        else sendResult(false, "촬영을 취소했습니다.");
        pendingCameraUri = null;
    }

    private void handlePermissionResult(Map<String, Boolean> result) {
        if (pendingWebPermission == null) return;
        boolean granted = !result.isEmpty() && result.values().stream().allMatch(Boolean::booleanValue);
        if (granted) pendingWebPermission.grant(pendingWebPermission.getResources());
        else pendingWebPermission.deny();
        pendingWebPermission = null;
    }

    private void sendMedia(List<Uri> uris) {
        JSONArray output = new JSONArray();
        for (Uri uri : uris) {
            try {
                byte[] bytes = readLimited(uri);
                JSONObject item = new JSONObject();
                item.put("name", "family-media-" + System.currentTimeMillis());
                item.put("mime", getContentResolver().getType(uri));
                item.put("size", bytes.length);
                item.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
                output.put(item);
            } catch (Exception error) {
                sendResult(false, error.getMessage());
            }
        }
        evaluate("window.Jumadeung&&window.Jumadeung.onNativeMedia(" + JSONObject.quote(output.toString()) + ")");
    }

    private byte[] readLimited(Uri uri) throws IOException {
        try (InputStream input = getContentResolver().openInputStream(uri); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IOException("미디어를 열 수 없습니다.");
            byte[] buffer = new byte[16384];
            int total = 0;
            int count;
            while ((count = input.read(buffer)) != -1) {
                total += count;
                if (total > MAX_BRIDGE_BYTES) throw new IOException("파일이 24MB 네이티브 브리지 제한을 초과했습니다.");
                output.write(buffer, 0, count);
            }
            return output.toByteArray();
        }
    }

    private static byte[] decodeDataUrl(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        return Base64.decode(comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl, Base64.DEFAULT);
    }

    private static String sanitizeName(String value) {
        return value == null || value.isBlank() ? "jumadeung-export" : value.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private void sendResult(boolean ok, String message) {
        try {
            JSONObject payload = new JSONObject().put("ok", ok).put("message", message == null ? "" : message);
            evaluate("window.Jumadeung&&window.Jumadeung.onNativeResult(" + JSONObject.quote(payload.toString()) + ")");
        } catch (Exception ignored) { }
    }

    private void evaluate(String script) { runOnUiThread(() -> webView.evaluateJavascript(script, null)); }

    @Override protected void onNewIntent(@NonNull Intent intent) { super.onNewIntent(intent); setIntent(intent); handleDeepLink(intent); }
    private void handleDeepLink(Intent intent) { Uri uri = intent.getData(); if (uri != null) dispatchDeepLink(uri.toString()); }
    private void dispatchDeepLink(String url) { evaluate("window.Jumadeung&&window.Jumadeung.onDeepLink(" + JSONObject.quote(url) + ")"); }
    @Override public void onBackPressed() { if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (webView != null) webView.destroy(); super.onDestroy(); }
}
