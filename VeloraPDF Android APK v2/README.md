# VeloraPDF Android WebView APK v2.1.14

Native Android WebView wrapper for the root VeloraPDF Vite web app.

This is the Android WebView APK build for the Velora PDF web experience. It is a real APK, not a PWA, and it replaces the removed legacy Expo/React Native mobile app.

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
- Android-native Downloads bridge exposed as `window.VeloraAndroidFiles` for Settings exports.
- PDF, HTML, and Markdown exports preserve pasted line breaks; PDF export uses stable rendered list markers.
- Settings theme controls sync across PDF, Notes, and Notebook views.
- PDF Search, Thumbnails, Bookmarks, Comments, and Attachments panels include fully wired action states.
- Notes block controls use the same bottom action bar on desktop, browser, tablet, and phone instead of hover-only floating controls.
- Notes bottom action pill scrolls horizontally on narrow phones and tablets so every editor action remains reachable without viewport overflow.
- Drag-and-drop photo import works inside Notes pages and handwritten Notebook pages, with mouse and touch corner resizing.
- Window-level image drops land directly in the active Notes editor on browser and desktop builds.
- Selected Notes images can be deleted from the bottom action bar or by right-clicking the image.
- Block insert and selected-image action panels open above the bottom pill on browser, DMG, tablet, phone, and Android WebView builds.
- Clicking a Notes image exposes move up, move down, and delete controls in the same bottom-pill panel system.
- Android-specific spacing for the Notes workspace and PDF editor toolbar.
- Phone-specific notebook responsive tuning so headers, controls, and handwritten pages fit narrow Android screens without horizontal document overflow.
- Taller phone writing pages for more comfortable stylus handwriting.
- Smoother PDF editor gestures in Android WebView: native momentum scrolling, two-finger pinch zoom, and clear canvas re-rendering after zoom.
- Hardware-accelerated WebView drawing for sharper PDF page movement on phones and tablets.
- Settings modal layout that scrolls correctly on Android screens.
- ABI split APKs for 32-bit and 64-bit Android targets.

## Release APKs

The current v2.1.14 APKs are stored in the root `downloads/` folder:

| Device / CPU | APK |
| --- | --- |
| Most modern phones and tablets, 64-bit ARM | [`downloads/Velora-PDF-Android-v2.1.14-arm64-v8a.apk`](../downloads/Velora-PDF-Android-v2.1.14-arm64-v8a.apk) |
| Older 32-bit ARM phones and tablets | [`downloads/Velora-PDF-Android-v2.1.14-armeabi-v7a.apk`](../downloads/Velora-PDF-Android-v2.1.14-armeabi-v7a.apk) |
| Android emulator / 32-bit x86 | [`downloads/Velora-PDF-Android-v2.1.14-x86.apk`](../downloads/Velora-PDF-Android-v2.1.14-x86.apk) |
| Android emulator / 64-bit x86 | [`downloads/Velora-PDF-Android-v2.1.14-x86_64.apk`](../downloads/Velora-PDF-Android-v2.1.14-x86_64.apk) |

They are also copied locally to:

```text
/Users/mutlu/Desktop/Velora-PDF-Android-APK-v2.1.14/
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
"./VeloraPDF Android APK v2/gradlew" -p "VeloraPDF Android APK v2" assembleRelease
```

Copy release outputs:

```bash
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-armeabi-v7a-release.apk" downloads/Velora-PDF-Android-v2.1.14-armeabi-v7a.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-arm64-v8a-release.apk" downloads/Velora-PDF-Android-v2.1.14-arm64-v8a.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-x86-release.apk" downloads/Velora-PDF-Android-v2.1.14-x86.apk
cp "VeloraPDF Android APK v2/app/build/outputs/apk/release/app-x86_64-release.apk" downloads/Velora-PDF-Android-v2.1.14-x86_64.apk
```

## Verification

The current release was verified with Android SDK build-tools:

- package name: `com.mutlukurt.velorapdfmobile`
- version code: `35`
- version name: `2.1.14`
- APK Signature Scheme v2: enabled
- native-code splits: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`
- permission present: `android.permission.RECORD_AUDIO`
- permission absent: `android.permission.INTERNET`
