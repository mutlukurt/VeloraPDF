package com.mutlukurt.velorapdf.webapk;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.Manifest;
import android.content.ContentValues;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final int FILE_CHOOSER_REQUEST = 42;
  private static final int MICROPHONE_PERMISSION_REQUEST = 43;
  private ValueCallback<Uri[]> filePathCallback;
  private PermissionRequest pendingPermissionRequest;
  private String pendingNativeRecorderCallbackId;
  private WebView webView;
  private WebViewAssetLoader assetLoader;
  private MediaRecorder nativeRecorder;
  private File nativeRecordingFile;
  private long nativeRecordingStartedAt;
  private int safeTopPx;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestWindowFeature(Window.FEATURE_NO_TITLE);

    webView = new WebView(this);
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    webView.setClipToPadding(true);
    webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    webView.setOnApplyWindowInsetsListener((view, insets) -> {
      safeTopPx = 0;
      injectSafeTop();
      return insets;
    });
    setContentView(webView);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      settings.setOffscreenPreRaster(true);
    }
    webView.addJavascriptInterface(new VeloraAndroidRecorderBridge(), "VeloraAndroidRecorder");
    webView.addJavascriptInterface(new VeloraAndroidFilesBridge(), "VeloraAndroidFiles");

    assetLoader = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
      .build();

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assetLoader.shouldInterceptRequest(request.getUrl());
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        injectSafeTop();
      }
    });
    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public void onPermissionRequest(PermissionRequest request) {
        for (String resource : request.getResources()) {
          if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
            if (hasMicrophonePermission()) {
              request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
            } else {
              pendingPermissionRequest = request;
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MICROPHONE_PERMISSION_REQUEST);
              } else {
                request.deny();
              }
            }
            return;
          }
        }
        request.deny();
      }

      @Override
      public boolean onShowFileChooser(
        WebView view,
        ValueCallback<Uri[]> callback,
        FileChooserParams params
      ) {
        if (filePathCallback != null) {
          filePathCallback.onReceiveValue(null);
        }
        filePathCallback = callback;

        Intent intent = params.createIntent();
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        try {
          startActivityForResult(intent, FILE_CHOOSER_REQUEST);
        } catch (Exception error) {
          filePathCallback = null;
          return false;
        }
        return true;
      }
    });

    webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
  }

  private boolean hasMicrophonePermission() {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
      checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
  }

  private void injectSafeTop() {
    if (webView == null) return;
    String script = "document.documentElement.classList.add('android-apk');" +
      "document.documentElement.style.setProperty('--android-safe-top','" + safeTopPx + "px');";
    webView.evaluateJavascript(script, null);
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;

    Uri[] results = null;
    if (resultCode == RESULT_OK && data != null) {
      Uri uri = data.getData();
      if (uri != null) {
        results = new Uri[] { uri };
      }
    }
    filePathCallback.onReceiveValue(results);
    filePathCallback = null;
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode != MICROPHONE_PERMISSION_REQUEST) return;

    boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
    if (pendingPermissionRequest != null && granted) {
      pendingPermissionRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
    } else if (pendingPermissionRequest != null) {
      pendingPermissionRequest.deny();
    }
    pendingPermissionRequest = null;

    if (pendingNativeRecorderCallbackId != null) {
      String callbackId = pendingNativeRecorderCallbackId;
      pendingNativeRecorderCallbackId = null;
      if (granted) {
        startNativeRecorder(callbackId);
      } else {
        sendRecorderResult(callbackId, errorPayload("Microphone permission was denied."));
      }
    }
  }

  @Override
  public void onBackPressed() {
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
      return;
    }
    super.onBackPressed();
  }

  private void ensureNativeRecorderPermission(String callbackId) {
    if (hasMicrophonePermission()) {
      startNativeRecorder(callbackId);
      return;
    }
    pendingNativeRecorderCallbackId = callbackId;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MICROPHONE_PERMISSION_REQUEST);
    } else {
      sendRecorderResult(callbackId, errorPayload("Microphone permission is not available."));
    }
  }

  private void startNativeRecorder(String callbackId) {
    try {
      stopAndReleaseNativeRecorder(false);
      nativeRecordingFile = File.createTempFile("velora-voice-", ".m4a", getCacheDir());
      nativeRecorder = new MediaRecorder();
      nativeRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
      nativeRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
      nativeRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
      nativeRecorder.setAudioEncodingBitRate(128000);
      nativeRecorder.setAudioSamplingRate(44100);
      nativeRecorder.setOutputFile(nativeRecordingFile.getAbsolutePath());
      nativeRecorder.prepare();
      nativeRecorder.start();
      nativeRecordingStartedAt = System.currentTimeMillis();

      JSONObject payload = new JSONObject();
      payload.put("ok", true);
      payload.put("event", "started");
      payload.put("mime", "audio/mp4");
      payload.put("name", nativeRecordingFile.getName());
      sendRecorderResult(callbackId, payload);
    } catch (Exception error) {
      stopAndReleaseNativeRecorder(true);
      sendRecorderResult(callbackId, errorPayload("Could not start Android audio recording."));
    }
  }

  private void stopNativeRecorder(String callbackId) {
    try {
      File file = nativeRecordingFile;
      long durationMs = nativeRecordingStartedAt > 0 ? System.currentTimeMillis() - nativeRecordingStartedAt : 0;
      stopAndReleaseNativeRecorder(false);
      if (file == null || !file.exists() || file.length() <= 0) {
        sendRecorderResult(callbackId, errorPayload("No audio data was captured."));
        return;
      }

      String dataUrl = "data:audio/mp4;base64," + Base64.encodeToString(readFileBytes(file), Base64.NO_WRAP);
      JSONObject payload = new JSONObject();
      payload.put("ok", true);
      payload.put("event", "stopped");
      payload.put("src", dataUrl);
      payload.put("mime", "audio/mp4");
      payload.put("name", file.getName());
      payload.put("duration", durationMs / 1000.0);
      sendRecorderResult(callbackId, payload);
      file.delete();
      nativeRecordingFile = null;
    } catch (Exception error) {
      stopAndReleaseNativeRecorder(true);
      sendRecorderResult(callbackId, errorPayload("Could not finish Android audio recording."));
    }
  }

  private void pauseNativeRecorder(String callbackId) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && nativeRecorder != null) nativeRecorder.pause();
      JSONObject payload = new JSONObject();
      payload.put("ok", true);
      payload.put("event", "paused");
      sendRecorderResult(callbackId, payload);
    } catch (Exception error) {
      sendRecorderResult(callbackId, errorPayload("Could not pause recording."));
    }
  }

  private void resumeNativeRecorder(String callbackId) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && nativeRecorder != null) nativeRecorder.resume();
      JSONObject payload = new JSONObject();
      payload.put("ok", true);
      payload.put("event", "resumed");
      sendRecorderResult(callbackId, payload);
    } catch (Exception error) {
      sendRecorderResult(callbackId, errorPayload("Could not resume recording."));
    }
  }

  private void cancelNativeRecorder(String callbackId) {
    stopAndReleaseNativeRecorder(true);
    JSONObject payload = new JSONObject();
    try {
      payload.put("ok", true);
      payload.put("event", "cancelled");
    } catch (Exception ignored) {
    }
    sendRecorderResult(callbackId, payload);
  }

  private void stopAndReleaseNativeRecorder(boolean deleteFile) {
    try {
      if (nativeRecorder != null) {
        try {
          nativeRecorder.stop();
        } catch (Exception ignored) {
        }
        nativeRecorder.release();
      }
    } finally {
      nativeRecorder = null;
      nativeRecordingStartedAt = 0;
      if (deleteFile && nativeRecordingFile != null) {
        nativeRecordingFile.delete();
        nativeRecordingFile = null;
      }
    }
  }

  private byte[] readFileBytes(File file) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    FileInputStream input = new FileInputStream(file);
    byte[] buffer = new byte[8192];
    int read;
    while ((read = input.read(buffer)) != -1) {
      output.write(buffer, 0, read);
    }
    input.close();
    return output.toByteArray();
  }

  private JSONObject errorPayload(String message) {
    JSONObject payload = new JSONObject();
    try {
      payload.put("ok", false);
      payload.put("error", message);
    } catch (Exception ignored) {
    }
    return payload;
  }

  private JSONObject successPayload(String path) {
    JSONObject payload = new JSONObject();
    try {
      payload.put("ok", true);
      payload.put("path", path);
    } catch (Exception ignored) {
    }
    return payload;
  }

  private void sendRecorderResult(String callbackId, JSONObject payload) {
    if (webView == null) return;
    String script = "window.__veloraAndroidRecorderCallback && window.__veloraAndroidRecorderCallback(" +
      JSONObject.quote(callbackId) + "," + payload.toString() + ");";
    webView.post(() -> webView.evaluateJavascript(script, null));
  }

  public class VeloraAndroidRecorderBridge {
    @JavascriptInterface
    public void startRecording(String callbackId) {
      runOnUiThread(() -> ensureNativeRecorderPermission(callbackId));
    }

    @JavascriptInterface
    public void stopRecording(String callbackId) {
      runOnUiThread(() -> stopNativeRecorder(callbackId));
    }

    @JavascriptInterface
    public void pauseRecording(String callbackId) {
      runOnUiThread(() -> pauseNativeRecorder(callbackId));
    }

    @JavascriptInterface
    public void resumeRecording(String callbackId) {
      runOnUiThread(() -> resumeNativeRecorder(callbackId));
    }

    @JavascriptInterface
    public void cancelRecording(String callbackId) {
      runOnUiThread(() -> cancelNativeRecorder(callbackId));
    }
  }

  public class VeloraAndroidFilesBridge {
    @JavascriptInterface
    public String saveDownload(String filename, String mimeType, String base64Data) {
      try {
        byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
        String safeName = filename == null || filename.trim().isEmpty() ? "velora-download" : filename.replaceAll("[\\\\/:*?\"<>|]", "_");
        String safeMime = mimeType == null || mimeType.trim().isEmpty() ? "application/octet-stream" : mimeType;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          ContentValues values = new ContentValues();
          values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
          values.put(MediaStore.Downloads.MIME_TYPE, safeMime);
          values.put(MediaStore.Downloads.IS_PENDING, 1);
          values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

          ContentResolver resolver = getContentResolver();
          Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
          if (uri == null) throw new Exception("Could not create download file.");

          OutputStream output = resolver.openOutputStream(uri);
          if (output == null) throw new Exception("Could not open download file.");
          output.write(bytes);
          output.close();

          values.clear();
          values.put(MediaStore.Downloads.IS_PENDING, 0);
          resolver.update(uri, values, null, null);
          return successPayload(uri.toString()).toString();
        }

        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
          throw new Exception("Could not open Downloads folder.");
        }
        File file = new File(downloadsDir, safeName);
        FileOutputStream output = new FileOutputStream(file);
        output.write(bytes);
        output.close();
        return successPayload(file.getAbsolutePath()).toString();
      } catch (Exception error) {
        return errorPayload("Could not save download on Android.").toString();
      }
    }
  }
}
