# BITMATE Native Container

This directory documents the Capacitor-based Android/iOS wrapper for the existing BITMATE production web application.

## Architecture

- Web business logic remains in the existing Next.js/Supabase application.
- Native shells load the production URL configured by `CAPACITOR_SERVER_URL`.
- Native-only behavior is gated through `Capacitor.isNativePlatform()`.
- No separate wallet, order, position, loan, ETF, mining, or CFD business logic exists in the native projects.

## Default identifiers

- App name: BITMATE
- Android applicationId: `com.bitmate.app`
- iOS bundle identifier: `com.bitmate.app`
- Version: `1.0.0`
- Android versionCode: `1`
- iOS build: `1`

Change identifiers before store registration if required, then run `npm run native:sync` and update the native project identifiers consistently.

## Android

Debug APK:

```bash
npm ci
npm run native:sync
npm run android:debug
```

Release signing:

1. Copy `android/key.properties.example` to `android/key.properties`.
2. Point `storeFile` to a local release keystore.
3. Fill signing values locally or in CI secrets.
4. Never commit the keystore or `key.properties`.
5. Build with `npm run android:bundle`.

## iOS

Open `ios/App/App.xcworkspace` on macOS/Xcode. Select the Apple Developer Team and provisioning profile locally. Team/certificate/profile values are intentionally not committed.

## Deep links

Prepared custom routes include:

- `bitmate://futures/BTCUSDT`
- `bitmate://cfd/BTCUSDT`
- `bitmate://account`
- `bitmate://mining`
- `bitmate://loan`

HTTPS app-link intent handling is prepared for `https://bitmates.vercel.app`. Full verified Universal/App Links require the final Android signing certificate fingerprint and Apple Team ID association files.

## Push / biometrics

Push notifications and biometrics are intentionally not activated in the first native package so the app does not request unused permissions. The Capacitor bridge is isolated so those plugins can be added later without duplicating BITMATE business logic.

## Offline behavior

The native shell uses `native/error.html` as a branded network failure fallback. Live financial data is not cached as authoritative state.
