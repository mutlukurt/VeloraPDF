<div align="center">

# Velora PDF

**Private, local-first PDF reading, annotation, and note-taking for macOS, Windows, Linux, and Android.**

<p>
  <a href="https://veloraproject.app/">
    <img alt="Website" src="https://img.shields.io/badge/Website-veloraproject.app-111827?style=for-the-badge&logo=safari&logoColor=white">
  </a>
  <a href="downloads/Velora-PDF-1.0.47-aarch64.dmg">
    <img alt="Download for macOS" src="https://img.shields.io/badge/macOS-Download-0A84FF?style=for-the-badge&logo=apple&logoColor=white">
  </a>
  <a href="downloads/Velora-PDF-1.0.53-x64-setup.exe">
    <img alt="Download for Windows" src="https://img.shields.io/badge/Windows-Download-0078D4?style=for-the-badge&logo=windows&logoColor=white">
  </a>
  <a href="downloads/Velora-PDF-1.0.53-amd64.deb">
    <img alt="Download for Linux" src="https://img.shields.io/badge/Linux-.deb-E95420?style=for-the-badge&logo=ubuntu&logoColor=white">
  </a>
  <a href="downloads/Velora-PDF-Android-v2.1.16-arm64-v8a.apk">
    <img alt="Download for Android" src="https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white">
  </a>
</p>

<p>
  <img alt="Local-first" src="https://img.shields.io/badge/Local--first-No_accounts_or_cloud_sync-10B981?style=flat-square">
  <img alt="Privacy focused" src="https://img.shields.io/badge/Privacy-No_tracking_or_analytics-6366F1?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square">
  <img alt="Built with Tauri 2" src="https://img.shields.io/badge/Built_with-Tauri_2-FFC131?style=flat-square&logo=tauri&logoColor=black">
</p>

[![Buy Me a Coffee](assets/bmc-button.svg)](https://buymeacoffee.com/mutlukurt)

<img alt="Velora PDF brand preview" src="assets/brand.webp">

</div>

---

## Table of Contents

- [What Is Velora PDF?](#what-is-velora-pdf)
- [Why Velora PDF?](#why-velora-pdf)
- [Feature Tour](#feature-tour)
- [Platform Support](#platform-support)
- [Downloads & Installation](#downloads--installation)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [Privacy](#privacy)
- [Current Limitations](#current-limitations)
- [Troubleshooting](#troubleshooting)
- [Version History](#version-history)
- [License](#license)

---

## What Is Velora PDF?

### In plain language

Velora PDF is a personal reading and note-taking app that lives entirely on **your** computer, tablet, or phone. You open a PDF, read it in a calm, beautifully designed workspace, mark it up with highlights, pen strokes, shapes, and sticky notes, and export an annotated copy — all without ever creating an account or sending a single byte to the internet.

Beyond PDFs, Velora also gives you:

- **Velora Notes** — a Notion-style page workspace where you write documents with headings, task lists, tables, code blocks, images, and voice memos, organized in a drag-and-drop page tree.
- **Velora Notebook** — a digital A4 paper notebook for handwriting with a stylus or finger, complete with folders, multi-page notebooks, pinch zoom, voice recordings, and PDF export.

There are no subscriptions, no logins, no cloud, no ads, and no tracking. If you turn off your Wi-Fi, everything still works.

### In technical language

Velora PDF is a cross-platform, local-first document workspace built on **Tauri 2** (Rust core) with a **React 18 + TypeScript + Vite** frontend. PDF rendering is handled client-side by **PDF.js** (`pdfjs-dist`), annotation overlays are managed in **Zustand** stores with undo/redo history, and annotated PDF export is composed with **pdf-lib**. The Notes and Notebook workspaces persist to a bundled **SQLite** database (via `rusqlite`, WAL mode, FTS5 full-text search) through typed Tauri IPC commands. A parallel native **Android** application embeds the identical Vite production bundle in a hardened `WebView` served by `WebViewAssetLoader`, shipping without the `INTERNET` permission.

One codebase produces:

| Artifact | Technology |
| --- | --- |
| macOS `.dmg` (Apple Silicon) | Tauri 2 bundle, WKWebView |
| Windows `.exe` (NSIS, x64) | Tauri 2 bundle, WebView2 |
| Linux `.deb` (amd64) | Tauri 2 bundle, WebKitGTK |
| Android `.apk` (4 ABIs) | Native Gradle project, `androidx.webkit` |
| Web preview | Plain Vite build with browser fallbacks |

---

## Why Velora PDF?

### The purpose

Most PDF and note apps today are cloud services first and applications second: they require accounts, push subscriptions, sync your documents to remote servers, and quietly collect analytics. Velora PDF is built on the opposite premise — **reading and thinking are private activities**, and the software that supports them should be fast, elegant, and silent.

### What you gain

| Benefit | What it means for you |
| --- | --- |
| 🔒 **True privacy** | No login, no telemetry, no external API calls. Documents never leave your device. |
| ⚡ **Speed** | Near-instant startup via aggressive code-splitting; heavy libraries load only when used. |
| 📴 **Full offline operation** | Every feature — reading, annotating, notes, handwriting, voice memos, export — works with zero connectivity. The Android APK doesn't even request the `INTERNET` permission. |
| 🗃️ **Data ownership** | Notes live in a plain SQLite file you can back up; annotations export as human-readable JSON sidecars; workspace backups are portable JSON. |
| 🎨 **Premium feel** | A calm, macOS-inspired workspace with dark/light themes, eye-protection mode, and motion-designed panels. |
| 💸 **Free forever** | MIT-licensed, no billing flow, no upsell. |

### Design philosophy

Velora aims to feel **premium, calm, local-first, fast, focused, desktop-native, minimal but capable, and private by default**. It intentionally excludes login, billing, team workspaces, analytics, remote databases, and cloud document storage — not as missing features, but as deliberate design decisions.

---

## Feature Tour

Each feature is described twice: first for everyday users, then for engineers.

### 📖 PDF Reader

**Plain language:** Open any PDF from your device and read it in a distraction-free canvas. Flip pages with arrows or scroll continuously, zoom with pinch gestures or shortcuts, jump around with the thumbnail strip, and tune the view with page backgrounds, page gaps, and an eye-protection mode for long sessions.

**Technical:** PDF.js documents are loaded through dynamic imports so the viewer never blocks first paint. Pages render lazily near the viewport with `IntersectionObserver`-driven canvas virtualization that unmounts off-screen canvas buffers to bound memory on large documents. Pinch zoom uses a GPU-composited preview during the gesture and defers PDF.js re-rasterization until gesture end. Scroll-position tracking keeps the current page indicator and the auto-following thumbnail panel in sync.

### ✍️ Annotations

**Plain language:** Mark up documents the way you would on paper — highlight passages, draw with a pen, underline or strike through text, drop rectangles, circles, and arrows, pin draggable sticky notes, add text notes, and even place your handwritten signature. Everything supports undo/redo, recoloring, duplication, and deletion, and your marks reappear automatically the next time you open the same PDF.

**Technical:** An SVG/DOM overlay layer (`AnnotationLayer`) sits above each PDF.js canvas. Annotation geometry is stored with the source page render dimensions so exports scale correctly to true PDF page coordinates. State lives in a Zustand store with a full undo/redo history stack. Annotations persist automatically to local storage keyed by document identity, and can be exported explicitly as a `annotations.velora.json` sidecar. Signatures are captured on a modal canvas pad and placed as base64 vector images.

### 🔍 Search

**Plain language:** Search inside the PDF and jump straight to any match. In the Notes workspace, a command palette (`Ctrl/Cmd + K`) finds any page or paragraph you've ever written, instantly.

**Technical:** PDF search extracts text via PDF.js `textContent` with baseline coordinate mapping to draw match-highlight overlays on the page. Workspace search runs on SQLite **FTS5** (porter + unicode61 tokenizer) with prefix matching and snippet generation, maintained incrementally per page edit rather than by full index rebuilds.

### 🗂️ Side Panels

**Plain language:** Five slide-out panels keep everything one click away: page **Thumbnails**, **Search**, **Bookmarks**, **Comments & Notes** (every annotation grouped by page, clickable), and **Attachments** (files you associate with the document). On phones they open as bottom drawers instead of squeezing the page.

**Technical:** Panels are lazy-mounted behind a panel-level React error boundary so a panel failure degrades gracefully instead of unmounting the reader. The Comments panel aggregates the annotation store grouped by page with inline renaming and direct navigation. Attachments persist locally per document.

### 📝 Velora Notes — the block workspace

**Plain language:** A private, Notion-style writing space. Create pages and subpages, drag them around the sidebar tree, and write with rich blocks: headings, task lists, tables, quotes, code with syntax highlighting, colored text, images you can drag-drop and resize, and voice memos you record right inside the page. Deleting, renaming, and reorganizing are instant, and closing the window never loses unsaved work.

**Technical:** The editor is **TipTap** (ProseMirror) with StarterKit plus table, task-list, image, link, highlight, color, and code-block-lowlight extensions. Documents serialize to JSON block rows in SQLite (`pages`/`blocks` schema with cascade deletes and FTS5 sync). Content is buffered in memory while typing and flushed on page switches and on a window-close intercept (`core:window:allow-close`) that saves before destroy. Voice memos stream `MediaRecorder` chunks directly to app-data files via Rust commands — no base64 blobs in the database — and play back through Tauri's asset protocol. Page/block drag-and-drop uses pointer-based movement (dnd-kit) with long-press thresholds tuned for touch.

### 📓 Velora Notebook — handwriting

**Plain language:** Digital paper. Organize notebooks into folders, write across multiple A4 pages with a stylus or finger, highlight, pan and pinch-zoom like real paper, drop photos onto pages and resize them from the corners, record voice notes, and export the whole notebook as a PDF.

**Technical:** A canvas-based A4 multi-page surface with pressure-friendly freehand strokes, four-corner touch/mouse image transforms, and local persistence. Notebook export composes pages (including image layers) into a paginated PDF. Phone layouts get taller writing pages and responsive header tuning; rendering stays crisp after zoom via re-rasterization.

### 📤 Export

**Plain language:** Share your work as normal files: an annotated copy of the PDF, clean printable PDFs of your notes, or HTML and Markdown versions. Annotation data can also be saved as a small JSON file that acts as your editable "source of truth".

**Technical:** Two export paths: (1) `annotations.velora.json` sidecar — lossless, editable archive; (2) best-effort annotated PDF via **pdf-lib**, drawing highlight/pen/shape/text/sticky/signature overlays into a new PDF copy at true page scale. Notes export to PDF via **html2canvas + jsPDF** with canvas-level blank-row detection for clean A4 page breaks, manually rendered list markers, and preserved hard line breaks; HTML/Markdown exports and ZIP archives (jszip) are also supported. On desktop, all file I/O goes through native Rust save dialogs; on Android, a native Downloads bridge handles exports.

### ⚙️ Settings & Theming

**Plain language:** Switch between light and dark themes (synced across PDF, Notes, and Notebook), enable eye-protection mode, adjust editor preferences, see exactly where your data lives on disk, and export or import a full workspace backup.

**Technical:** Theming is CSS-variable driven and applied pre-paint from `localStorage` by an inline `index.html` script to avoid theme flash. The About panel detects the runtime (desktop/web/Android bridge) and reports the correct version. Workspace backup is a single JSON document; import runs in one SQLite transaction with cached prepared statements (multi-second imports reduced to sub-second).

### 🏠 Home & Recent Files

**Plain language:** A welcoming home screen shows your recent PDFs as cards — reopen with one click or clear them with the trash button.

**Technical:** On desktop, recent files reopen by path via Rust. In browsers, `FileSystemAccessAPI` handles are persisted in IndexedDB with permission re-prompting and a cached-bytes fallback, so recent files survive reloads without re-picking.

---

## Platform Support

| Platform | Distribution | Renderer | Min. version | Status |
| --- | --- | --- | --- | --- |
| **macOS** (Apple Silicon) | `.dmg` | WKWebView | macOS 12.0 | ✅ Shipping (v1.0.47) |
| **Windows** (x64) | NSIS `.exe` | WebView2 | Windows 10 | ✅ Shipping (v1.0.53) |
| **Linux** (amd64) | `.deb` | WebKitGTK 4.1 | Ubuntu 22.04+ / Debian 12+ | ✅ Shipping (v1.0.53) |
| **Android** (4 ABIs) | `.apk` | Android WebView | Android 7+ | ✅ Shipping (v2.1.16) |
| **Web preview** | Vite build | Any modern browser | — | 🧪 Development/preview |

All desktop builds share the same Rust core and frontend. The Android APK is a separate native Gradle project that embeds the identical web bundle — it is a real APK, not a PWA.

---

## Downloads & Installation

### 🐧 Linux (Ubuntu / Debian)

Download: [Velora-PDF-1.0.53-amd64.deb](downloads/Velora-PDF-1.0.53-amd64.deb)

```bash
sudo apt install ./Velora-PDF-1.0.53-amd64.deb
```

`apt` resolves the two runtime dependencies (`libwebkit2gtk-4.1-0`, `libgtk-3-0`) automatically — both ship in standard Ubuntu/Debian repositories. After installation, launch **Velora PDF** from your application menu or run `velora-pdf` in a terminal.

Your data lives at `~/.local/share/com.mutlukurt.velorapdf/` (XDG data directory).

To remove:

```bash
sudo apt remove velora-pdf
```

### 🍎 macOS (Apple Silicon)

Download: [Velora-PDF-1.0.47-aarch64.dmg](downloads/Velora-PDF-1.0.47-aarch64.dmg)

This build is unsigned (distributed outside the App Store without an Apple Developer ID), so Gatekeeper may warn that the developer "cannot be verified" or claim the app "is damaged". The DMG itself is perfectly valid; the message comes from Apple's quarantine flag on unsigned downloads.

1. Open the DMG and drag `Velora PDF.app` into **Applications**.
2. Clear the quarantine flag:

```bash
xattr -cr "/Applications/Velora PDF.app"
```

3. Launch Velora PDF from Applications. (Alternatively: right-click the app → **Open** → confirm **Open**.)

### 🪟 Windows (x64)

Download: [Velora-PDF-1.0.53-x64-setup.exe](downloads/Velora-PDF-1.0.53-x64-setup.exe)

Run the NSIS installer and follow the prompts. Windows SmartScreen may show an "unknown publisher" notice for the unsigned installer — choose **More info → Run anyway**.

### 🤖 Android

Real native APK — installs offline, requests no `INTERNET` permission.

| Device / CPU | APK |
| --- | --- |
| Most modern phones & tablets (64-bit ARM) | [arm64-v8a](downloads/Velora-PDF-Android-v2.1.16-arm64-v8a.apk) |
| Older 32-bit ARM devices | [armeabi-v7a](downloads/Velora-PDF-Android-v2.1.16-armeabi-v7a.apk) |
| Emulator / 32-bit x86 | [x86](downloads/Velora-PDF-Android-v2.1.16-x86.apk) |
| Emulator / 64-bit x86 | [x86_64](downloads/Velora-PDF-Android-v2.1.16-x86_64.apk) |

For a normal Android phone, use **arm64-v8a**. Enable "Install unknown apps" for your browser/file manager when prompted.

<details>
<summary><strong>📱 Android screenshots (phone & tablet)</strong></summary>

#### Phone

| Home | Notes workspace |
| --- | --- |
| <img src="assets/screenshots/android-v2/velora-android-v2-phone-home.png" alt="Velora PDF Android phone home screen" width="260"> | <img src="assets/screenshots/android-v2/velora-android-v2-phone-workspace.png" alt="Velora PDF Android phone notes workspace" width="260"> |

| PDF editor | Settings |
| --- | --- |
| <img src="assets/screenshots/android-v2/velora-android-v2-phone-pdf-editor.png" alt="Velora PDF Android phone PDF editor" width="260"> | <img src="assets/screenshots/android-v2/velora-android-v2-phone-settings-about.png" alt="Velora PDF Android phone settings" width="260"> |

#### Tablet

| Home | Notes workspace |
| --- | --- |
| <img src="assets/screenshots/android-v2/velora-android-v2-tablet-home.png" alt="Velora PDF Android tablet home screen" width="360"> | <img src="assets/screenshots/android-v2/velora-android-v2-tablet-workspace.png" alt="Velora PDF Android tablet notes workspace" width="360"> |

| PDF editor | Settings |
| --- | --- |
| <img src="assets/screenshots/android-v2/velora-android-v2-tablet-pdf-editor.png" alt="Velora PDF Android tablet PDF editor" width="360"> | <img src="assets/screenshots/android-v2/velora-android-v2-tablet-settings-about.png" alt="Velora PDF Android tablet settings" width="360"> |

</details>

---

## Architecture

Velora PDF is organized in four layers. The first three form the desktop application; the fourth wraps the same frontend for Android.

```text
┌───────────────────────────────────────────────────────────────┐
│                     Frontend (src/)                           │
│   React 18 · TypeScript · Vite · Tailwind · Zustand           │
│   PDF viewer · Annotation overlay · Notes (TipTap) ·          │
│   Notebook canvas · Panels · Theming · Command palette        │
├───────────────────────────────────────────────────────────────┤
│                  Tauri IPC (typed commands)                   │
├───────────────────────────────────────────────────────────────┤
│                  Rust Core (src-tauri/)                       │
│   SQLite (rusqlite, WAL, FTS5) · Native file dialogs ·        │
│   Voice-recording disk streaming · Backup import/export ·     │
│   Window lifecycle (hidden-until-painted reveal)              │
├───────────────────────────────────────────────────────────────┤
│              OS WebView + Bundler                             │
│   WKWebView (macOS·dmg) · WebView2 (Windows·nsis) ·           │
│   WebKitGTK (Linux·deb)                                       │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│        Android wrapper (VeloraPDF Android APK v2/)            │
│   Native Gradle app · WebViewAssetLoader serves the same      │
│   Vite bundle from APK assets · JS bridges for microphone     │
│   (VeloraAndroidRecorder) and Downloads (VeloraAndroidFiles)  │
│   · ABI-split release APKs · no INTERNET permission           │
└───────────────────────────────────────────────────────────────┘
```

### 1. Desktop shell (`src-tauri/`)

- Tauri 2 window management: the main window starts hidden and is revealed by a `velora-ready` event emitted from an inline `index.html` script as soon as the boot shell paints — with a Rust-side fallback timer — eliminating white-flash startup on every OS.
- Capability-scoped security: only dialog, scoped filesystem, and window-close permissions are granted (`capabilities/default.json`). The asset protocol is limited to the local `voice-recordings` folder.
- Bundle targets: `dmg` (macOS), `nsis` (Windows), `deb` (Linux) from a single config.

### 2. Rust core (`src-tauri/src/lib.rs`)

- **SQLite** database (`velora_notes.sqlite3`) opened in WAL mode with foreign keys; schema covers `pages`, `blocks`, `page_links`, `tags`, `page_tags`, and an FTS5 `search_index`.
- ~20 typed IPC commands: page/block CRUD, incremental per-page search-index updates, workspace backup import (single transaction, prepared statements), native PDF/JSON/binary file dialogs, Downloads-folder saves, and chunked voice-recording file streaming with path validation.
- Entirely platform-agnostic: zero `#[cfg(target_os)]` branches — all paths resolve through Tauri's `app_data_dir()` / `download_dir()` abstractions.

### 3. Frontend (`src/`)

- **State:** Zustand stores per domain (`usePdfStore`, `useAnnotationStore`, `useUiStore`, `useBookmarkStore`, `useAttachmentStore`) plus a workspace store for Notes.
- **Performance:** `manualChunks` code-splitting (startup JS ~60 KB; React vendor chunk trimmed to ~143 KB), `Suspense`-lazy heavy views, dynamic imports for `pdfjs-dist` and export libraries, canvas virtualization for large PDFs.
- **Dual-runtime design:** every native capability (file dialogs, voice recording, persistence) has a browser fallback (`FileSystemAccessAPI`, IndexedDB, `MediaRecorder`), so the same bundle runs in Tauri, plain browsers, and the Android WebView.

### 4. Android wrapper (`VeloraPDF Android APK v2/`)

- A native Android module (`androidx.webkit`) serving the embedded Vite production build through `WebViewAssetLoader` — fully offline, hardware-accelerated rendering, native momentum scrolling and pinch zoom.
- JavaScript bridges expose native microphone recording and Downloads-folder export to the web layer.
- Release builds are ABI-split (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`).

### Where your data lives

| OS | Location |
| --- | --- |
| macOS | `~/Library/Application Support/com.mutlukurt.velorapdf/` |
| Windows | `%APPDATA%\com.mutlukurt.velorapdf\` |
| Linux | `~/.local/share/com.mutlukurt.velorapdf/` |
| Android | App-private storage inside the APK sandbox |

The Notes database is the single file `velora_notes.sqlite3`; voice memos live beside it in `voice-recordings/`. The Settings dialog shows the exact path on your machine.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2, Rust (edition 2021) |
| Database | SQLite via `rusqlite` (bundled), WAL, FTS5 |
| Frontend framework | React 18, TypeScript (strict), Vite 6 |
| Styling | Tailwind CSS + CSS variables (light/dark theming), `tailwind-merge`, `clsx` |
| State | Zustand |
| Rich text | TipTap 3 (ProseMirror) + lowlight syntax highlighting |
| PDF rendering | PDF.js (`pdfjs-dist`) |
| PDF composition | `pdf-lib`, jsPDF, html2canvas |
| Archives | JSZip |
| Drag & drop | dnd-kit |
| Icons / motion | Lucide React, Framer Motion |
| Native plugins | `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs` |
| Android | Gradle, `androidx.webkit`, `WebViewAssetLoader`, JS bridges |
| Build tooling | Tauri CLI, PostCSS, Autoprefixer |

---

## Keyboard Shortcuts

`Cmd` on macOS, `Ctrl` on Windows and Linux — both are accepted everywhere.

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + O` | Open PDF |
| `Cmd/Ctrl + F` | Open search panel |
| `Cmd/Ctrl + K` | Command palette (Notes) |
| `Cmd/Ctrl + +` / `-` | Zoom in / out |
| `Cmd/Ctrl + 0` | Reset zoom (fit width) |
| `Cmd/Ctrl + Z` | Undo annotation change |
| `Cmd/Ctrl + Shift + Z` | Redo annotation change |
| `←` / `→` | Previous / next page |
| `PageUp` / `PageDown` | Page navigation (single-page mode) |
| `Space` | Hand tool |
| `Esc` | Close right panel |

---

## Project Structure

```text
velora-pdf/
├── src/                          # React frontend
│   ├── app/App.tsx               # Root component
│   ├── components/
│   │   ├── layout/               # AppShell, TopToolbar, LeftRail, RightInspector
│   │   ├── pdf/                  # PdfViewer, PdfPage, AnnotationLayer, side panels
│   │   ├── annotations/          # Annotation toolbar & UI
│   │   ├── home/                 # Home screen, recent-files grid
│   │   ├── notes/                # Notes workspace shell
│   │   ├── notebook/             # Handwritten notebook workspace
│   │   ├── ui/                   # Button, Modal, Tooltip, primitives
│   │   └── brand/                # Velora logo
│   ├── features/
│   │   ├── editor/               # TipTap editor, block menu, audio recorder, notebook paper
│   │   ├── sidebar/              # Page tree, drag & drop
│   │   ├── search/               # Command palette
│   │   └── settings/             # Settings dialog
│   ├── lib/
│   │   ├── pdf/                  # PDF.js loading, search, pdf-lib export, annotation storage
│   │   ├── tauri/                # Native dialogs, voice-recording streaming
│   │   ├── export/               # PDF/HTML/Markdown document export
│   │   ├── db/                   # SQLite IPC client + browser fallback
│   │   ├── store/                # Workspace state
│   │   ├── browser/              # FileSystemAccessAPI fallback
│   │   └── utils/                # Shortcuts, text utils, helpers
│   ├── stores/                   # Zustand stores (pdf, annotation, ui, bookmark, attachment)
│   └── styles/                   # Tailwind + CSS variables
├── src-tauri/                    # Rust desktop core
│   ├── src/lib.rs                # IPC commands, SQLite, window lifecycle
│   ├── tauri.conf.json           # Window, security, bundle config (dmg/nsis/deb)
│   ├── capabilities/default.json # Scoped permissions
│   └── icons/                    # All platform icons
├── VeloraPDF Android APK v2/     # Native Android WebView wrapper (Gradle)
├── downloads/                    # Published installers (.dmg, .exe, .deb, .apk)
├── assets/                       # Brand images & screenshots
└── public/                       # Static assets (fonts)
```

---

## Development Guide

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (stable) — install via [rustup](https://rustup.rs)
- Platform toolchains:
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Microsoft C++ Build Tools + WebView2 runtime
  - **Linux (Ubuntu/Debian):**

    ```bash
    sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
      build-essential curl wget file libssl-dev pkg-config
    ```

  - **Android:** Android Studio / SDK (only for the APK wrapper)

### Run in development

```bash
npm install

# Full desktop app (native dialogs, SQLite, real behavior)
npm run tauri:dev

# Browser-only preview (UI work; uses browser fallbacks)
npm run dev
```

Browser preview is convenient for UI iteration, but native file dialogs, SQLite persistence, and voice-recording disk streaming should be tested through Tauri.

### Production builds

```bash
# Frontend bundle only
npm run build

# Desktop build for the current OS (dmg on macOS / nsis exe on Windows)
npm run tauri:build

# Linux .deb specifically
npm run tauri:build:deb
```

Output locations:

```text
src-tauri/target/release/bundle/dmg/    Velora PDF_<version>_aarch64.dmg      (macOS)
src-tauri/target/release/bundle/nsis/   Velora PDF_<version>_x64-setup.exe    (Windows)
src-tauri/target/release/bundle/deb/    Velora PDF_<version>_amd64.deb        (Linux)
```

### Android APK build

```bash
npm run build
rm -rf "VeloraPDF Android APK v2/app/src/main/assets/web"
mkdir -p "VeloraPDF Android APK v2/app/src/main/assets/web"
cp -R dist/. "VeloraPDF Android APK v2/app/src/main/assets/web/"
"./VeloraPDF Android APK v2/gradlew" -p "VeloraPDF Android APK v2" assembleRelease
```

ABI-split release APKs are written to the Gradle `outputs` directory and copied into `downloads/`.

### Release metadata

| Field | Value |
| --- | --- |
| Current desktop version | `1.0.53` |
| Current Android version | `2.1.16` |
| Bundle identifier | `com.mutlukurt.velorapdf` |
| Product name | `Velora PDF` |
| Desktop bundle targets | `dmg`, `nsis`, `deb` |

---

## Privacy

Velora PDF is designed as an offline, local application. It contains **no**:

- Login or user accounts
- Cloud sync or remote database
- Analytics, tracking, or telemetry
- Advertising SDKs
- Subscription or billing flow
- External AI or OCR API calls

PDFs are opened from local file paths and processed entirely on your device. The Android APK does not request the `INTERNET` permission, making network access impossible at the OS level.

---

## Current Limitations

Velora PDF is a focused product, not a full Acrobat replacement. Deliberately out of scope for now:

- Editing existing PDF text content
- OCR of scanned documents
- Cryptographic digital-signature workflows
- Page reorder / delete / merge tools
- A full PDF-spec annotation engine — annotated PDF export is best-effort overlay drawing; the JSON sidecar remains the lossless source of truth
- Search-match overlays are baseline-mapped rather than a full text-layer overlay

These boundaries keep the app fast, local, and reliable.

---

## Troubleshooting

### macOS blocks the app ("developer cannot be verified" / "damaged")

The build is unsigned; clear the quarantine flag and reopen:

```bash
xattr -cr "/Applications/Velora PDF.app"
```

### Linux: `.deb` install reports missing dependencies

Install through `apt` (not `dpkg -i` directly) so dependencies resolve automatically:

```bash
sudo apt install ./Velora-PDF-1.0.53-amd64.deb
```

### File dialogs don't work in browser preview

Native open/save requires the Tauri shell — run `npm run tauri:dev`. The browser preview intentionally falls back to browser file pickers.

### Vite warns about large chunks

PDF.js ships a large worker; chunks above 500 kB after minification are expected for the PDF vendor bundles and do not block production builds.

### An exported PDF is missing advanced annotation detail

Keep the `annotations.velora.json` sidecar as your editable archive. PDF export is a best-effort visual composition intended for sharing, not a complete PDF annotation-spec implementation.

---

## Version History

The complete, day-one-to-today changelog. Desktop releases (`1.0.x`) and Android WebView APK releases (`v2.1.x`) are listed in reverse chronological order.

### 1.0.53 — Linux .deb release

Released to bring Velora PDF to Linux desktops.

- Added the `deb` bundle target and a dedicated `npm run tauri:build:deb` script; the existing macOS `dmg` and Windows `nsis` targets are unchanged.
- Published the first Ubuntu/Debian package: `downloads/Velora-PDF-1.0.53-amd64.deb` (amd64, WebKitGTK 4.1 runtime, ~7 MB).
- Registered sized hicolor icons (32–512 px) and a desktop launcher entry so the app integrates with Linux application menus.
- Verified the packaged binary launches and persists data under `~/.local/share/com.mutlukurt.velorapdf/`.
- No application code changes were required — the Rust core and frontend were already platform-agnostic.

### 1.0.53

Released to make page deletion instant.

- Archiving (deleting) a page now updates only that page's rows in the search index via `update_search_index_for_page`, instead of running a full `rebuild_search_index`, removing the ~2 second delay.
- Renaming and other page metadata edits use the same per-page index update, so they are faster too.
- Full index rebuilds are now reserved for one-time operations like seeding and backup import.
- Rebuilt and republished the Windows `1.0.53` x64 EXE setup installer.

### 1.0.52

Released to protect unsaved notes from accidental window closes.

- The app now intercepts the window close request, flushes the active note to SQLite, and then completes the close, so a stray click on the close button can no longer lose in-progress work.
- Saving still happens on page changes too; the close handler only adds a final save on exit instead of saving on every keystroke.
- Added the `core:window:allow-close` and `core:window:allow-destroy` capabilities required to finish the close after saving.
- Rebuilt and republished the Windows `1.0.52` x64 EXE setup installer.

### 1.0.51

Released to make the window appear as early as physically possible on launch.

- Added an inline reveal script in `index.html` that emits `velora-ready` as soon as the boot shell paints, so the window is shown before the React bundle finishes loading instead of waiting for the app to mount.
- Enabled `withGlobalTauri` so the inline script can emit the reveal event without importing the module bundle.
- Narrowed the `vendor-react` chunk to React, React DOM and the scheduler, trimming it from ~965 KB to ~143 KB so the first interactive paint arrives sooner.
- Note: the remaining startup time is dominated by the Windows WebView2 runtime initialization, which is outside the app's control.
- Rebuilt and republished the Windows `1.0.51` x64 EXE setup installer.

### 1.0.50

Released for near-instant startup and much faster backup import.

- Code-split the Vite bundle with `manualChunks`, shrinking the startup JS chunk from ~2.7 MB to ~60 KB.
- Lazy-loaded the PDF viewer, notes workspace and notebook workspace with `Suspense`, so heavy views load only when opened.
- Deferred `pdfjs-dist` and the PDF export libraries to dynamic imports so they no longer block the first paint.
- Wrapped backup import in a single SQLite transaction with cached prepared statements, turning multi-second imports into sub-second ones.
- Rebuilt and republished the Windows `1.0.50` x64 EXE setup installer.

### 1.0.49

Released to fully eliminate the Windows startup white flash.

- The main window is created hidden (`visible: false`) and stays hidden until the React UI has painted, so users never see a blank white WebView2 window.
- The frontend emits a `velora-ready` event after first paint; the Rust layer listens for it and reveals the window instantly.
- Added a guaranteed Rust-side fallback timer that always reveals the window, so a missed event can never leave it hidden.
- The inline boot shell in `index.html` now applies the saved theme before paint, so the reveal matches light/dark mode with no color flash.
- Rebuilt and republished the Windows `1.0.49` x64 EXE setup installer.

### 1.0.48

Released with faster Windows desktop startup and note editing by deferring SQLite saves until page changes.

Changes:

- Notes content now stays in memory while you type and persists to SQLite only when you switch pages, leave Notes, or create/archive pages.
- Replaced full-workspace search-index rebuilds on every save with per-page search-index updates in the Rust backend.
- Removed eager first-page loading during app startup; the home screen loads immediately while the workspace index loads in the background.
- Added an inline loading shell in `index.html` so Tauri no longer shows a blank white window while the bundle boots.
- Rebuilt and republished the Windows `1.0.48` x64 EXE setup installer.

### Android WebView APK v2.1.16

Released with a robust touch drag-and-drop fix for mobile/tablet devices in the sidebar, implementing pointer capture and callout-prevention styles to ensure smooth drag-and-drop without browser-level gesture cancellation.

Changes:

- Added pointer capture handling on long press to prevent native gesture hijacking.
- Added explicit user-select and touch-callout CSS styles to page rows to block context menus and selection magnifiers.
- Bounded touch wiggle cancellation to 25px (from 10px) to prevent micro-movements from cancelling dragging.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.47

Released with robust touch drag-and-drop improvements for touchscreens in the sidebar, added Windows desktop target support, and rebuilt the Windows installer to fix desktop import/export.

Changes:

- Implemented touchscreen-specific wiggling thresholds (25px) and pointer capture APIs.
- Embedded selection and callout prevention styling directly on draggable page rows.
- Built and published the macOS `1.0.47` Apple Silicon DMG.
- Added full Windows compile target support using Tauri 2 and Rust.
- Built and published the Windows `1.0.47` x64 EXE setup installer.
- Fixed Windows desktop import/export failures for PDF open/save, annotated PDF export, Velora JSON sidecars, workspace backup import/export, and Settings archive downloads by moving file I/O to native Rust dialogs instead of the Tauri filesystem plugin scope.
- Added Rust commands for PDF pick/read/save, JSON pick/save, and binary save dialogs used by the desktop app.
- Made workspace backup import accept both `blocks` and legacy `docs` backup formats.
- Resolved Windows command prompt debug console leakage by enforcing the GUI subsystem window attribute in `main.rs`.
- Updated Android WebView APK release builds to v2.1.16 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.15

Released with history back/forward navigation buttons and clickable breadcrumbs in the editor header.

Changes:

- Added header navigation support.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.46

Released with history back/forward navigation buttons and clickable breadcrumbs in the editor header.

Changes:

- Added clickable parent breadcrumbs and history tracking to navigation stores.
- Built and published the macOS `1.0.46` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.15 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.14

Released with a 1-second (1000ms) long press requirement to initiate page dragging in the sidebar. This allows users to drag and drop pages reliably while maintaining smooth, natural vertical scrolling gestures.

Changes:

- Reduced the long press drag initiation timeout from 2000ms to 1000ms.
- Ensured dragged pages drop and stay where they are released correctly.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.45

Released with a 1-second long press requirement to drag sidebar pages.

Changes:

- Adjusted the drag threshold to 1000ms to improve responsiveness.
- Ensured moved pages persist in their dropped destinations.
- Built and published the macOS `1.0.45` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.14 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.13

Released with a 2-second long press requirement to initiate page dragging in the sidebar. This allows vertical touch gestures to scroll the sidebar smoothly and naturally by default.

Changes:

- Implemented a 2000ms delay for dragging in the page sidebar.
- Enabled native touch scrolling (`touch-pan-y` by default, `touch-none` only when actively dragging) so narrow screens can navigate lists easily.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.44

Released with a 2-second long press requirement to drag sidebar pages, allowing standard scrolling lists.

Changes:

- Implemented a 2000ms delay to start dragging pages in the sidebar to prevent accidental drag triggers during scroll gestures.
- Dynamic touch action settings to scroll page columns naturally.
- Built and published the macOS `1.0.44` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.13 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.12

Released to dynamically sync the application version inside the Settings dialog and about panel.

Changes:

- Modified the Settings About tab to detect platform and display correct dynamic version ("2.1.12" for Android splits, "1.0.43" for DMG/Web builds).
- Updated local build outputs and verified package details.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.43

Released to dynamically sync the application version inside the Settings dialog and about panel.

Changes:

- Modified the Settings About tab to detect platform and display correct dynamic version ("2.1.12" for Android splits, "1.0.43" for DMG/Web builds).
- Updated local build outputs and verified package details.
- Built and published the macOS `1.0.43` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.12 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.11

Released with page navigation controls in the editor header for seamless traversal.

Changes:

- Added clickable back and forward navigation arrows to the editor header so users can traverse their browsing history.
- Kept the toolbar and back/forward states synced with browser and workspace history.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.42

Released to add back and forward navigation history controls to the editor header.

Changes:

- Integrated previous page and next page history navigation buttons inside the workspace header.
- Allowed users to traverse their document access order seamlessly.
- Built and published the macOS `1.0.42` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.11 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.10

Released with a horizontally scrollable Notes bottom action pill for narrow Android phones and tablets.

Changes:

- Made the Notes bottom action pill horizontally scrollable on narrow screens instead of compressing or overflowing actions.
- Kept action buttons fixed-size so add, text, move, delete, undo, redo, image, and status controls remain tappable.
- Raised the editor action pill above the global mobile navigation layer so taps land on the editor controls.
- Kept tablet-width layouts inside the viewport while preserving desktop centered pill behavior.
- Verified 360px, 412px, 768px, 820px, 1024px, and 1440px viewport behavior with automated browser checks.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.41

Released to make the Notes bottom action pill scrollable on narrow screens.

Changes:

- Added horizontal scrolling to the Notes bottom action pill on phones and tablets with constrained width.
- Prevented Samsung A35-style narrow viewport overflow by letting the action row pan left and right.
- Kept desktop browser and DMG layouts centered and non-scrollable when the full action row fits.
- Built and published the macOS `1.0.41` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.10 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.9

Released with unified bottom-pill popovers for block insertion and selected-image controls from the root VeloraPDF web build.

Changes:

- Anchored the block insert menu above the bottom action pill instead of opening from the left side.
- Moved selected-image move up, move down, and delete controls above the bottom pill.
- Matched the popover behavior across desktop browser, macOS DMG, phone, tablet, and Android WebView.
- Verified desktop and mobile viewport alignment with automated browser checks.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.40

Released to align editor popovers above the bottom action pill.

Changes:

- Anchored the Notes block picker above the bottom action pill on all supported view sizes.
- Moved the selected-image Move up, Move down, and Delete panel above the same pill for a unified editor workflow.
- Kept selected-image block movement and deletion working from both the popover and bottom action bar.
- Built and published the macOS `1.0.40` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.9 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.8

Released with a right-side selected-image action panel and image block movement controls from the root VeloraPDF web build.

Changes:

- Added a right-side action panel that opens when a Notes image is selected.
- Added selected-image move up and move down controls for sending an image one block higher or lower.
- Kept selected-image delete available from the right-side panel.
- Connected the bottom action bar arrows to selected-image movement when an image is active.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.39

Released to add a selected-image action panel and image block movement.

Changes:

- Added a right-side panel with Move up, Move down, and Delete for selected Notes images.
- Added selected-image block movement so an image can move one block above or below neighboring content.
- Reused the bottom action bar arrows for image movement when an image is selected.
- Built and published the macOS `1.0.39` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.8 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.7

Released with stronger image drag-and-drop handling and selected-image delete controls from the root VeloraPDF web build.

Changes:

- Added window-level image drop handling so dragging a photo into the app/browser inserts it into the active Notes editor.
- Kept selected image state active when moving to the bottom action bar so images can be deleted from there.
- Added right-click delete for resizable Notes images.
- Restyled the Notes bottom action bar as a centered modern pill under the editor instead of a full-width strip from the Settings rail.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.38

Released to fix real file drag-and-drop, selected-image deletion, and the Notes bottom action bar position.

Changes:

- Added browser/DMG window-level image drop handling for the active Notes editor.
- Disabled Tauri's native file-drop interception so desktop drops reach the web editor.
- Enabled bottom-bar deletion for selected Notes images and right-click image deletion.
- Restyled the bottom action bar as a centered pill aligned with the editor area.
- Built and published the macOS `1.0.38` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.7 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.6

Released with unified Notes block controls and drag-and-drop image import from the root VeloraPDF web build.

Changes:

- Moved Notes block add, move, delete, undo, redo, and photo insert actions into the same bottom action bar used across desktop, browser, tablet, and phone.
- Added drag-and-drop photo import for Notes pages with resizable image blocks.
- Added drag-and-drop photo import for handwritten Notebook pages with four-corner mouse/touch resizing and local persistence.
- Included notebook page images in exported Notebook PDFs.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.37

Released to unify block controls and add resizable photo drops to Notes and Notebook.

Changes:

- Replaced desktop hover-only block controls with the shared bottom action bar.
- Added resizable photo blocks to the rich Notes editor.
- Added draggable and corner-resizable photo layers to handwritten Notebook pages.
- Exported Notebook page images into generated PDFs.
- Built and published the macOS `1.0.37` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.6 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.5

Released with fully wired Settings controls and PDF side-panel interactions from the root VeloraPDF web build.

Changes:

- Synchronized Settings theme controls across the PDF reader, Notes workspace, and Notebook workspace.
- Made PDF sidebar panel actions more reliable on desktop and touch screens.
- Improved Search, Thumbnails, Bookmarks, Comments, and Attachments panels with clearer active, empty, and action states.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.36

Released to make Settings controls and PDF side-panel tools fully functional.

Changes:

- Synchronized Light/Dark theme switching between the PDF reader and the local Notes/Notebook workspace.
- Added clearer Settings feedback for theme changes and editor preference resets.
- Made touch-screen PDF panel actions visible instead of hover-only.
- Added clearer empty/clear/jump states for Search and Thumbnails panels.
- Built and published the macOS `1.0.36` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.5 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.4

Released with the PDF export formatting fix from the root VeloraPDF web build.

Changes:

- Preserved hard line breaks in exported HTML, Markdown, and PDF files.
- Rendered PDF export list markers manually so numbered and bulleted lists do not disappear in canvas-based PDF output.
- Fixed pasted exam/question content where answer labels such as `B)` could attach to the previous question line during PDF export.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.35

Released to fix rich-text PDF export formatting for pasted documents.

Changes:

- Preserved editor line breaks in exported PDF, HTML, and Markdown files.
- Replaced native browser list markers in PDF export with stable rendered markers for better html2canvas output.
- Built and published the macOS `1.0.35` Apple Silicon DMG.
- Updated Android WebView APK release builds to v2.1.4 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### Android WebView APK v2.1.3

Released to refine phone notebook ergonomics while keeping the tablet layout intact.

Changes:

- Made the notebook library header and active notebook top bar responsive on phone widths.
- Extended the phone writing page height so stylus users have more room to write.
- Kept handwritten notebook pages fitted to narrow phone viewports on first open.
- Kept tablet and desktop notebook layouts at their existing larger scale.
- Rebuilt Android WebView APK release outputs for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

### 1.0.34

Released to add the notebook workspace and clean the release structure around macOS DMG plus Android WebView APK builds.

Changes:

- Added Velora Notebook with folder organization, A4 multi-page handwriting, highlighting, pinch zoom, panning, voice memo recording, and PDF export.
- Reused the existing workspace Voice memo recorder inside notebooks for consistent microphone recording and playback behavior.
- Updated Android WebView APK release builds to v2.1.3 for `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.
- Built and published the macOS `1.0.34` Apple Silicon DMG.
- Removed the legacy native Expo/React Native mobile app and legacy APK downloads from the repository.
- Added a Gradle wrapper directly to the Android WebView APK project so it builds without the removed native mobile folder.

### 1.0.33

Released to restore browser-imported recent PDFs without forcing users to pick the same file every time.

Changes:

- Stores browser PDF file handles in local IndexedDB when the browser supports the File System Access API.
- Reopens recent browser PDFs from the original file after reload, with a browser permission prompt only when needed.
- Keeps a local cached fallback for imported browser PDFs so recent files can still open when direct file access is unavailable.
- Updates recent PDF cards and the Notes sidebar Last PDF action to use the full recent-file identity instead of path-only reopening.
- Keeps Tauri desktop path reopening unchanged.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.33`.

### 1.0.32

Released to make the PDF reader usable as a mobile-first web reading surface.

Changes:

- Fits PDF pages to phone width while keeping the zoom control as a readable multiplier.
- Forces mobile PDF reading into continuous vertical scrolling so users can drag down through the document naturally.
- Turns PDF side panels into mobile drawers instead of letting thumbnails, search, bookmarks, comments, or attachments squeeze the page.
- Keeps the view settings panel closed by default on phones and opens it as a mobile sheet when requested.
- Allows vertical touch scrolling through the PDF when the reader is in select, hand, or search mode.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.32`.

### 1.0.31

Released to make browser voice recording more reliable on desktop systems.

Changes:

- Added live microphone signal detection to the Notes voice recorder so silent desktop input is visible immediately.
- Added clearer errors for blocked, missing, busy, muted, or non-secure microphone access in desktop browsers.
- Requests final recorder data before stopping and records smaller chunks to avoid empty captures on Chrome, Edge, Safari, and Firefox desktop.
- Protects saved notes from zero-byte voice recordings when the browser starts recording but no audio data arrives.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.31`.

### 1.0.30

Released to make the mobile web workspace behave more like a real Notion-style document app.

Changes:

- Moved the app rail to a compact bottom navigation on mobile so the editor can use the full phone width.
- Changed the Notes sidebar to a true mobile drawer that opens over the document instead of squeezing it.
- Improved mobile editor spacing, typography, action tap targets, table overflow, media sizing, and drawer layering.
- Keeps the desktop layout unchanged while making phone and tablet layouts more usable for `veloraproject.app` visitors.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.30`.

### 1.0.29

Released to improve the responsive web experience for phone and tablet visitors.

Changes:

- Made the Velora Notes workspace usable on mobile with an overlay notes sidebar and a compact editor header.
- Improved the Notion-style editor layout on narrow screens, including title sizing, icon picker width, and document action wrapping.
- Tuned the home screen for phone/tablet layouts with compact hero typography and full-width primary actions.
- Made the PDF toolbar, right inspector, and reading canvas adapt more gracefully to small screens.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.29`.

### 1.0.28

Released to make the Attachments side panel open and work correctly when a PDF has no saved attachments yet.

Changes:

- Fixed the empty attachment list state so opening Attachments no longer trips the side-panel error boundary.
- Keeps the Attachments panel functional for adding, downloading, and deleting document-associated files.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.28`.

### 1.0.27

Released to make the PDF workspace side panels safer and to reduce home-screen clutter.

Changes:

- Fixed the Attachments side panel so opening it while reading a PDF no longer blanks the app.
- Added a panel-level error boundary so side-panel failures stay inside the panel instead of taking down the full PDF view.
- Made attachment add, download, delete, and persistence errors explicit in the Attachments panel.
- Hid the PDF top toolbar and right View Settings inspector on the home screen; they now appear only after a PDF is open.
- Disabled PDF-only left rail tools until a PDF is actually loaded.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.27`.

### 1.0.26

Released to make the View Settings panel fully functional in the desktop reader.

Changes:

- Connected Single Page, Continuous Scrolling, Eye Protection Mode, Show Gaps Between Pages, and Page Background controls to the PDF reading workspace.
- Added paged wheel navigation for non-continuous reading mode and PageUp/PageDown keyboard navigation.
- Added selectable page background swatches with persisted local settings.
- Built and copied the macOS aarch64 DMG to the desktop and `downloads/Velora-PDF-1.0.26-aarch64.dmg`.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.26`.

### 1.0.24

Released to make Notes drag-and-drop movement reliable in the macOS WebView.

Changes:

- Replaced native HTML drag behavior with pointer-based movement for editor blocks.
- Replaced native sidebar page drag behavior with pointer-based movement.
- Prevents text selection/native drag interference while moving blocks or pages.
- Keeps page reparenting before, after, and inside another page with SQLite persistence.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.24`.

### 1.0.23

Released to add drag-and-drop organization in Velora Notes.

Changes:

- Added drag-and-drop block reordering from the editor block handle.
- Added drag-and-drop page movement in the Notes sidebar.
- Supports moving pages before, after, or inside another page as a subpage.
- Persists sidebar page order and parent/subpage changes to local SQLite.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.23`.

### 1.0.22

Released to fix playback for disk-backed Notes voice recordings.

Changes:

- Enabled Tauri's asset protocol for the local `voice-recordings` app data folder.
- Allows saved voice memo files to be loaded back into the WebView audio player.
- Keeps the long-recording disk streaming behavior introduced in `1.0.21`.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.22`.

### 1.0.21

Released to make Notes voice recording suitable for very long sessions.

Changes:

- Streams desktop voice recording chunks directly to local app data files instead of keeping the full recording in memory.
- Saves finished voice notes as local audio-file references in the active note, avoiding large base64 audio blobs in SQLite.
- Removes any app-defined recording duration cap; practical recording length is limited by available disk space and system resources.
- Keeps browser preview fallback behavior for development, while the packaged macOS app uses disk-backed recording.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.21`.

### 1.0.20

Released to fix microphone startup for Notes voice recording on macOS.

Changes:

- Added the macOS `NSMicrophoneUsageDescription` bundle key so the desktop app can request microphone access.
- Added a visible microphone-starting state while macOS/WebView permission is being prepared.
- Keeps the voice recorder controls introduced in `1.0.19` unchanged after permission is granted.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.20`.

### 1.0.19

Released to add page-level voice recording to Velora Notes.

Changes:

- Added a native-device microphone recorder to the Notes editor using the browser/WebView media recording stack.
- Added record, pause, resume, stop, playback, 10-second rewind/forward, and draggable seek controls.
- Lets finished recordings be saved directly into the active note as local audio blocks.
- Styled voice recording and saved audio blocks to match the Velora Notes workspace theme.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.19`.

### 1.0.18

Released to keep saved PDF stickers and sticky notes after the app is closed.

Changes:

- Added automatic local persistence for PDF annotations keyed to the opened PDF file.
- Restores saved stickers, sticky notes, highlights, drawings, text notes, and signatures when the same PDF is opened again.
- Keeps manual JSON sidecar export available while making sticker saves durable immediately.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.18`.

### 1.0.17

Released to prevent Notes PDF exports from cutting text across page breaks.

Changes:

- Added canvas-level blank-row detection before slicing exported Notes pages into A4 PDF pages.
- Uses real white-space bands between text lines and blocks as page-break candidates.
- Falls back to DOM-based cut positions only when a safe blank canvas band cannot be found.
- Keeps the clean white Notes PDF export style introduced in `1.0.16`.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.17`.

### 1.0.16

Released to make Velora Notes PDF export look like a normal clean PDF document.

Changes:

- Removed the legacy Kairnly metadata line from Notes PDF exports.
- Changed Notes PDF export pages to a plain white PDF background.
- Removed cream/card-like export styling so downloaded PDFs read like standard documents.
- Preserved actual content formatting such as headings, lists, tables, links, text colors, and highlights.
- Renamed the internal Notes PDF export template classes from Kairnly-specific names to Velora-specific names.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.16`.

### 1.0.15

Released to add a fast return path from Velora Notes back to the most recently opened PDF.

Changes:

- Added a `Last PDF` action to the Velora Notes sidebar near the page creation and search controls.
- Lets users jump directly from the Notion-style notes workspace back to the currently loaded PDF when it is still open.
- Reopens the most recent local PDF from the recent-files list when the PDF is not currently loaded in memory.
- Keeps the PDF thumbnail sidebar active after returning, so the document context is immediately visible.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.15`.

### 1.0.14

Released to make sticky-note labels editable before the note is first saved.

Changes:

- Enabled double-click editing for the top sticky-note label inside the initial create/edit card.
- Saved the draft label into newly created sticky notes instead of forcing the default page label.
- Kept sticky-note label editing focused and isolated from the note text editor.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.14`.

### 1.0.13

Released to make sticky-note top labels editable directly on the note.

Changes:

- Added a per-sticky-note label field so the top number can be edited manually.
- Enabled double-click editing directly on the sticky note label.
- Preserved custom sticky labels in annotation state, duplication, and PDF export.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.13`.

### 1.0.12

Released to repair and redesign sticky notes as pinned visual cards.

Changes:

- Redesigned placed sticky notes as pinned white cards with colored inner note panels, soft shadows, subtle rotation, and a pin head.
- Updated the sticky-note create/edit popover to open as a larger pinned writable card matching the placed note style.
- Kept sticky notes draggable and bounded within the PDF page using the updated card dimensions.
- Updated sticky-note PDF export to draw a larger white note card, colored inner panel, and pin marker.
- Synchronized package, Tauri, Cargo, README, and DMG release metadata to `1.0.12`.

### 1.0.11

Released to keep the thumbnail page list synchronized with document scrolling.

Changes:

- Auto-scrolls the left thumbnail panel to follow the current visible PDF page.
- Keeps the active page thumbnail in view while scrolling through the document.
- Preserves manual thumbnail navigation while keeping the panel synchronized afterward.
- Bumped application version to `1.0.11` and built the production macOS DMG.

### 1.0.10

Released to add freeform sticky-note repositioning on PDF pages.

Changes:

- Added drag-and-drop movement for sticky-note cards directly on the PDF canvas.
- Preserved annotation history by saving the new sticky-note position when the drag ends.
- Clamped sticky-note movement inside page bounds so notes stay reachable after repositioning.
- Bumped application version to `1.0.10` and built the production macOS DMG.

### 1.0.8

Released to bring sticky-note UI into the Velora PDF application design system.

Changes:

- Restyled sticky notes as compact Velora-style cards with refined borders, shadows, icon surfaces, selected state, and a subtle folded corner.
- Updated the sticky note editor to use the app surface, toolbar header, matching controls, and consistent 8px-radius panel styling.
- Refined the annotation toolbar with clearer color swatches, selected-color checkmarks, better event isolation, and app-consistent action buttons.
- Bumped application version to `1.0.8` and built the production macOS DMG.

### 1.0.7

Released to fix sticky-note annotation placement and PDF export fidelity.

Changes:

- Stored source page render dimensions with new annotations so exported overlays scale to the actual PDF page size instead of the old fixed viewport fallback.
- Updated sticky notes from icon-only markers to readable note cards with visible text previews and selection styling.
- Exported sticky notes as colored note boxes with wrapped text in the annotated PDF output.
- Fixed sticky-note toolbar actions so selected notes can change color and open an inline editor from the edit button.
- Replaced sticky/text note prompt editing with inline editing in the PDF layer and Comments & Notes panel.
- Bumped application version to `1.0.7` and built the production macOS DMG.

### 1.0.6

Released to implement advanced drawing tools (Signature, Underline, Strike), Page Cropping, local document Attachments, search highlighting, and memory virtualization.

Changes:

- Added Underline and Strike drawing tool annotations that render native SVG lines on PDF pages.
- Implemented a Signature drawing tool modal canvas signature pad and placed base64 vector signatures.
- Added a Page Cropping tool that adjusts viewport dimensions and shifts page layouts using CSS translations, with a floating "Reset Crop" option.
- Created an Attachments sidebar panel to list, download, and delete local files associated with specific PDFs.
- Enabled Search Query Highlight Overlays using baseline coordinate mapping to highlight search matches dynamically.
- Implemented canvas-level DOM virtualization via IntersectionObserver to automatically unmount canvas buffers and reduce memory usage on large documents.
- Bumped application version to `1.0.6` and built the production macOS DMG.

### 1.0.5

Released to introduce page bookmarking, an annotation summary sidebar, and various workspace UI/UX fixes.

Changes:

- Added a local-first page bookmarking store and a bookmark management sidebar panel.
- Added a Bookmark toggle button inside the viewer status bar.
- Integrated a Comments & Notes sidebar panel that aggregates and groups all annotations by page number, allowing direct navigation and inline renaming.
- Mounted the Settings Dialog globally at the root shell to open it directly from the LeftRail settings button.
- Fixed coordinates computation and display bug for the Annotation Toolbar when selecting pen drawings.
- Added canvas empty space deselection behavior.
- Repositioned the page number badge inside the visible page boundaries to prevent container clipping.
- Fixed an infinite re-render loop on the home screen when no active file is loaded (preventing blank/white screen crashes).
- Bumped application version to `1.0.5` and built the production macOS DMG.

### 1.0.4

Released to resolve window layout conflicts when operating in Notes view under small window/screen dimensions.

Changes:

- Fixed the macOS window control traffic lights (close, minimize, zoom buttons) overlap issue in the Notes workspace view.
- Imported the missing class utility `cn` inside `LeftRail.tsx`.
- Shifted top icons in `LeftRail` and layout elements in `Sidebar` (both open and collapsed states) to start at `y=48px` to cleanly clear the overlay buttons.
- Bumped application version to `1.0.4` and built the production DMG release.

### 1.0.3

Released to integrate the private local workspace features and rich notes functionality.

Changes:

- Integrated the block-based private local workspace notes functionality (from Kairnly project) into Velora PDF.
- Enabled SQLite local-first storage, Welcome pages, page icons, drag-and-drop sortable page trees, Tiptap-based rich-text editing, sidebar toggle, settings, and command palette.
- Integrated Velora PDF styles (variables, extended shadows) and added Notes Workspace entry cards to the home screen.
- Bumped version to `1.0.3` and built the production DMG release.

### 1.0.2

Released to support clearing/deleting recent files from the dashboard.

Changes:

- Added the ability to delete recent file cards directly from the Home screen grid.
- Added a hover-visible trash icon button with event propagation handling to clear files from the local storage.
- Bumped version to `1.0.2` and built the production DMG release.

### 1.0.1

Released as the first polish update after the initial v1 desktop build.

Changes:

- Recent files on the home screen can now be reopened directly from their cards.
- The floating page and zoom control is fixed to the viewer area instead of living inside the scrollable page canvas.
- macOS trackpad pinch zoom support was added for two-finger zoom gestures.
- `Ctrl + wheel` zoom handling was added for WebView/browser-style pinch events.
- Pinch zoom was optimized to use a smooth GPU preview during the gesture and defer heavy PDF.js re-rendering until the gesture ends.
- Zoom preview no longer uses a whole-workspace CSS transform, preventing ghost side panels and unstable scroll bounds during pinch gestures.
- Zoom now resizes the PDF page layout directly while preserving viewport center, so the document can freely find its natural scroll area.
- PDF pages now render lazily near the viewport instead of re-rendering every page during zoom changes.
- App metadata and documentation were updated to version `1.0.1`.

### 1.0.0

Initial Velora PDF v1 desktop release.

Included:

- Local PDF open flow.
- PDF.js page rendering.
- Thumbnail navigation.
- Search panel.
- Dark and light premium app shell.
- Eye protection mode.
- Highlight, pen, shape, text, and sticky-note annotation overlay.
- JSON sidecar annotation save.
- Best-effort annotated PDF export.
- macOS app icon and DMG build.


---

## License

Velora PDF is released under the [MIT License](LICENSE).

Copyright (c) Mutlu Kurt
