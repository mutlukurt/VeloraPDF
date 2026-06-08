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

The release build produces split APKs for all configured Android ABIs:

```txt
android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk
android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
android/app/build/outputs/apk/release/app-x86-release.apk
android/app/build/outputs/apk/release/app-x86_64-release.apk
```

The published desktop copies are:

```txt
/Users/mutlu/Desktop/VeloraPDF Mobile APKs/Velora-PDF-Mobile-1.0.0-armeabi-v7a.apk
/Users/mutlu/Desktop/VeloraPDF Mobile APKs/Velora-PDF-Mobile-1.0.0-arm64-v8a.apk
/Users/mutlu/Desktop/VeloraPDF Mobile APKs/Velora-PDF-Mobile-1.0.0-x86.apk
/Users/mutlu/Desktop/VeloraPDF Mobile APKs/Velora-PDF-Mobile-1.0.0-x86_64.apk
```

## Current Release Notes

Velora PDF Mobile now ships as one responsive Android project for phones and tablets. Tablet-specific behavior is handled inside the same source tree and the same APK outputs, so there is no separate tablet project to maintain.

This release includes:

- Full multi-page PDF loading and stable page navigation for imported documents.
- A cleaned tablet PDF reader with the toolbar fixed at the top, a visible back/home control, compact annotation tools, and the redundant left page list removed.
- Responsive PDF reading across portrait and landscape tablet use, with pinch zoom available on the reading surface.
- A notebook workspace for clean A4 pages, including blank, lined, and grid paper templates.
- Portrait and landscape notebook pages, with orientation saved per page.
- PDF export for notebooks that respects each page's portrait or landscape A4 orientation.
- Stylus-friendly palm rejection for notebook writing and PDF annotation.
- Practical note tools on phone and tablet: pen, highlight, eraser, undo, redo, color controls, zoom, page navigation, recording, playback, and export.

## Working MVP Features

- Premium Velora PDF home screen
- Android document picker for PDF files
- Local copy into app document storage
- PDF rendering with native `react-native-pdf`
- Current page and page count display
- Page navigation
- Pinch zoom through the native PDF viewer
- Responsive phone and tablet layouts
- Fixed top toolbar for PDF and notebook workflows
- Dark/light/system theme
- Eye protection mode
- Recent files
- Highlight annotation
- Pen annotation
- Eraser, undo, redo, and color selection tools
- Notebook pages with blank, lined, and grid templates
- Portrait and landscape A4 note pages
- Notebook PDF export
- Audio recording and local playback inside notes
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
