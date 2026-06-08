# Velora PDF Mobile

Velora PDF Mobile is a calm, private PDF workspace for reading and annotating documents on Android tablets and phones.

This is a separate React Native / Expo app. It does not port or reuse the desktop Tauri codebase.

## Product Principles

- No ads
- No login
- No subscription
- No cloud sync
- No analytics
- No tracking
- Local PDF selection and local PDF reading
- Local annotation storage
- Offline first

## Stack

- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- AsyncStorage
- react-native-pdf
- react-native-svg
- expo-document-picker
- expo-file-system
- expo-sharing

## Development

```sh
npm install
npm run start
```

Expo Go is not the target for this app because the PDF renderer uses native modules. Use an Android build.

## Android APK Build

The target package is:

```txt
com.mutlukurt.velorapdfmobile
```

Debug APK build:

```sh
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The project is configured for arm64-v8a output. Copy the generated APK to the desktop:

```sh
cp "<generated-arm64-apk-path>" "/Users/mutlu/Desktop/Velora-PDF-Mobile-1.0.0-arm64.apk"
```

Expected generated paths include:

```txt
android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

## Working MVP Features

- Premium Velora PDF home screen
- Android document picker for PDF files
- Local copy into app document storage
- PDF rendering with native `react-native-pdf`
- Current page and page count display
- Page navigation
- Pinch zoom through the native PDF viewer
- Responsive phone and tablet layouts
- Dark/light/system theme
- Eye protection mode
- Recent files
- Highlight annotation
- Pen annotation
- Local annotation persistence
- Annotation JSON export/share
- Original PDF share
- Standalone release APK with embedded JS bundle

## Known Gaps

- PDF text search is a placeholder in the first MVP.
- Annotated PDF export is experimental and not presented as complete.
- Page thumbnails use page-card fallback instead of rendered thumbnails.
- Rectangle/circle tools are simple MVP overlays.
- Full Acrobat-style annotation editing is intentionally out of scope.

## V2 Ideas

- Real text search
- Rendered page thumbnails
- Annotation selection handles
- Undo/redo stack
- Annotated PDF flatten/export
- Stylus-specific pressure support
- Better large-document virtualization
