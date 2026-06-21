# Velora PDF Downloads

This folder contains only the current release builds:

- macOS DMG for the desktop app.
- Windows x64 NSIS setup installer for the desktop app.
- Android WebView APK v2.1.16 builds for phones, tablets, and emulators.

## macOS

| Device | Download |
| --- | --- |
| Apple Silicon Mac | [Velora-PDF-1.0.47-aarch64.dmg](Velora-PDF-1.0.47-aarch64.dmg) |

## Windows

| Device | Download |
| --- | --- |
| Windows 10/11 x64 | [Velora-PDF-1.0.50-x64-setup.exe](Velora-PDF-1.0.50-x64-setup.exe) |

This Windows build opens almost instantly. The frontend bundle is code-split so the startup chunk shrank from ~2.7 MB to ~60 KB, with PDF, editor and export libraries loaded on demand. Backup import is now wrapped in a single SQLite transaction, making it several times faster. The window still stays hidden until the themed UI has painted, then reveals with no white flash.

## Android WebView APK v2.1.16

| Device / CPU | APK |
| --- | --- |
| Most modern phones and tablets, 64-bit ARM | [Velora-PDF-Android-v2.1.16-arm64-v8a.apk](Velora-PDF-Android-v2.1.16-arm64-v8a.apk) |
| Older 32-bit ARM phones and tablets | [Velora-PDF-Android-v2.1.16-armeabi-v7a.apk](Velora-PDF-Android-v2.1.16-armeabi-v7a.apk) |
| Android emulator / 32-bit x86 | [Velora-PDF-Android-v2.1.16-x86.apk](Velora-PDF-Android-v2.1.16-x86.apk) |
| Android emulator / 64-bit x86 | [Velora-PDF-Android-v2.1.16-x86_64.apk](Velora-PDF-Android-v2.1.16-x86_64.apk) |

For a normal Android phone or tablet, use `Velora-PDF-Android-v2.1.16-arm64-v8a.apk`.

## SHA256

```text
b84436df0e99d8549e5c36dd7006667afcd0c6ce3d1b40bebe4e3e00acad865f  Velora-PDF-1.0.47-aarch64.dmg
83aec4797c48e17d1697918163dc847335cc31939f7e64cb99343044d5b9be06  Velora-PDF-1.0.50-x64-setup.exe
26abe306c50b0358ac489df8db9b6a55212a291f8c98f877b8570f0776a96a1a  Velora-PDF-Android-v2.1.16-arm64-v8a.apk
47c7f8e66f4c8f7d168cebf99de08f86b3c94ce62f3086e46b361e13d05b1a70  Velora-PDF-Android-v2.1.16-armeabi-v7a.apk
f9f01c17f1e8610b0f293e4e2c90fabfee3d7b751101250862ee04012b2e311b  Velora-PDF-Android-v2.1.16-x86.apk
b1ff141dd5db4902bf5acb1338002fa54a7740dab12be9cf246ab3f5b0182e2e  Velora-PDF-Android-v2.1.16-x86_64.apk
```
