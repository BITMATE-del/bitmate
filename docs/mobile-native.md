# BITMATE Native Container

BITMATE 앱은 기존 Production 웹의 비즈니스 로직을 복제하지 않고 Capacitor Native Container가 동일한 Vercel/Supabase/RPC/API를 사용하도록 구성한다.

## Runtime

- App name: BITMATE
- Default package / bundle id: `com.bitmate.app`
- Version: `1.0.0`
- Android versionCode: `1`
- iOS build: `1`
- Web server: `https://bitmates.vercel.app`
- Capacitor: 8.x
- Node.js: 22+

등록 전에 ID를 변경하려면 `BITMATE_APP_ID`와 `capacitor.config.ts`를 변경한 뒤 Native project를 다시 생성한다. Apple Team, certificate, provisioning profile과 Android keystore는 저장소에 넣지 않는다.

## Native-only behavior

`NativeBridge`는 Capacitor 환경에서만 활성화된다. 웹 브라우저에서는 실행되지 않는다.

- Android back: dialog/drawer/search를 먼저 닫고, 이전 route가 있으면 history back, 홈에서는 종료 확인
- lifecycle: foreground 복귀 시 `bitmate:native-resume` 이벤트
- network: offline banner + reconnect event
- status bar: dark BITMATE UI에 맞는 light system text
- keyboard: Native keyboard open state와 safe-area 처리
- deep link: `bitmate://...` custom scheme
- external HTTP(S): Capacitor Browser
- clipboard: Native Clipboard, Web fallback
- splash: dark background + BITMATE asset

## Deep links

1차 Native project에는 custom scheme `bitmate://`를 준비한다.

예:
- `bitmate://futures/BTCUSDT`
- `bitmate://cfd/BTCUSDT`

Universal Link / Android App Link의 domain verification은 Apple Team, production signing certificate SHA-256, 최종 domain association 파일이 준비된 뒤 활성화한다. 서명정보를 추측해서 저장소에 하드코딩하지 않는다.

## Push / Biometrics

이번 1차에는 push server, Face ID/Touch ID/Android biometric 로그인 로직을 새로 만들지 않는다. Native Container 구조는 이후 official Capacitor plugin을 추가할 수 있게 유지한다.

## Android release signing

실제 keystore와 비밀번호는 GitHub에 저장하지 않는다. `android/keystore.properties.example`을 참고하고 Play release 전에 GitHub Actions Secret 또는 로컬 signing config를 연결한다.

## Store privacy checklist

현재 앱은 기존 BITMATE 웹과 동일한 계정/거래 데이터를 사용한다. 추가 Contacts, Location, Microphone, Camera 권한은 요청하지 않는다. Google Play Data Safety / Apple App Privacy 작성 시 실제 Production 데이터 흐름을 기준으로 검토한다.

## Web / App update boundary

- API/market/content 변화: 기존 Production web/server deployment
- Native plugin, permissions, package metadata 변화: Store binary update
- Store 정책을 우회하는 임의 live-code updater는 사용하지 않는다.
