# VeloraPDF Android APK v2

Native Android WebView wrapper for the root VeloraPDF Vite web app.

This is the Android APK v2 build requested for the mobile web experience. It is a real APK, not a PWA, and it does not use the legacy Expo/React Native mobile UI from `VeloraPDF Mobile/`.

The release APK embeds the built web assets under `app/src/main/assets/web` and loads them with Android `WebViewAssetLoader` from:

```text
https://appassets.androidplatform.net/assets/web/index.html
```

Because every app asset is packaged inside the APK, the release does not request the Android `INTERNET` permission.

## Included Behavior

- Root VeloraPDF mobile web UI packaged as a native Android WebView APK.
- Offline app startup and offline bundled assets.
- Local Inter and Fraunces fonts.
- Bundled Velora icon image assets for Home, Sidebar, Settings, and PDF editor chrome.
- Android-native microphone recorder bridge exposed to the web app as `window.VeloraAndroidRecorder`.
- Android-specific spacing for the Notes workspace and PDF editor toolbar.
- Settings modal layout that scrolls correctly on Android screens.
- ABI split APKs for 32-bit and 64-bit Android targets.

## Release APKs

The current v2 APKs are stored in the root `downloads/` folder:

| Device / CPU | APK |
| --- | --- |
| Most modern phones and tablets, 64-bit ARM | [`downloads/Velora-PDF-Android-v2-arm64-v8a.apk`](../downloads/Velora-PDF-Android-v2-arm64-v8a.apk) |
| Older 32-bit ARM phones and tablets | [`downloads/Velora-PDF-Android-v2-armeabi-v7a.apk`](../downloads/Velora-PDF-Android-v2-armeabi-v7a.apk) |
| Android emulator / 32-bit x86 | [`downloads/Velora-PDF-Android-v2-x86.apk`](../downloads/Velora-PDF-Android-v2-x86.apk) |
| Android emulator / 64-bit x86 | [`downloads/Velora-PDF-Android-v2-x86_64.apk`](../downloads/Velora-PDF-Android-v2-x86_64.apk) |

They are also copied locally to:

```text
/Users/mutlu/Desktop/Velora-PDF-Android-APK-v2/
```

## Screenshots

Phone captures:

| Home | Notes workspace |
| --- | --- |
| <img src="../assets/screenshots/android-v2/velora-android-v2-phone-home.png" alt="Velora PDF Android APK v2 phone home screen" width="260"> | <img src="../assets/screenshots/android-v2/velora-android-v2-phone-workspace.png" alt="Velora PDF Android APK v2 phone notes workspace" width="260"> |

| PDF editor | Settings |
| --- | --- |
| <img src="../assets/screenshots/android-v2/velora-android-v2-phone-pdf-editor.png" alt="Velora PDF Android APK v2 phone PDF editor" width="260"> | <img src="../assets/screenshots/android-v2/velora-android-v2-phone-settings-about.png" alt="Velora PDF Android APK v2 phone settings about screen" width="260"> |

Tablet captures:

| Home | Notes workspace |
| --- | --- |
| <img src="../assets/screenshots/android-v2/velora-android-v2-tablet-home.png" alt="Velora PDF Android APK v2 tablet home screen" width="360"> | <img src="../assets/screenshots/android-v2/velora-android-v2-tablet-workspace.png" alt="Velora PDF Android APK v2 tablet notes workspace" width="360"> |

| PDF editor | Settings |
| --- | --- |
| <img src="../assets/screenshots/android-v2/velora-android-v2-tablet-pdf-editor.png" alt="Velora PDF Android APK v2 tablet PDF editor" width="360"> | <img src="../assets/screenshots/android-v2/velora-android-v2-tablet-settings-about.png" alt="Velora PDF Android APK v2 tablet settings about screen" width="360"> |

## Build

From the repository root:

```bash
npm run build
rm -rf "VeloraPDF Android APK v2/app/src/main/assets/web"
mkdir -p "VeloraPDF Android APK v2/app/src/main/assets/web"
cp -R dist/. "VeloraPDF Android APK v2/app/src/main/assets/web/"
"VeloraPDF Mobile/android/gradlew" -p "VeloraPDF Android APK v2" assembleRelease
```

Copy release outputs:

```bash
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-armeabi-v7a-release.apk" downloads/Velora-PDF-Android-v2-armeabi-v7a.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-arm64-v8a-release.apk" downloads/Velora-PDF-Android-v2-arm64-v8a.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-x86-release.apk" downloads/Velora-PDF-Android-v2-x86.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-x86_64-release.apk" downloads/Velora-PDF-Android-v2-x86_64.apk
```

## Verification

The current release was verified with Android SDK build-tools:

- package name: `com.mutlukurt.velorapdfmobile`
- version code: `2`
- version name: `2.0.0`
- APK Signature Scheme v2: enabled
- native-code splits: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`
- permission present: `android.permission.RECORD_AUDIO`
- permission absent: `android.permission.INTERNET`
