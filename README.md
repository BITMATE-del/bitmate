# Astra Digital Assets — DEMO-first MVP

4050 친화형 AI 디지털자산 트레이딩 플랫폼의 DEMO 우선 초기 실행 버전입니다.

## 현재 구현/반영 상태
- Next.js App Router 기반 반응형 UI
- HOME / DEMO / AI Trading / Quick Trade / Spot / Assets / Admin
- Binance 공개 24h ticker 서버 프록시
- REAL 기능 Feature Flag 기본 OFF
- Supabase 실제 프로젝트에 초기 DB 스키마 반영 완료
- profiles / demo_balances / ledger_entries / demo_orders / ai_strategies / ai_subscriptions / ai_logs / system_settings / admin_logs
- 신규 회원 DEMO KRW 10,000,000 자동 지급 트리거
- 사용자별 RLS 및 내부 설정/관리 로그 클라이언트 차단 정책
- 실제 성과 데이터가 없을 때 가짜 수익률 미표시

## 아직 완료가 아닌 항목
- Auth UI와 SSR 세션 흐름
- DEMO 주문 체결 RPC와 원자적 ledger 반영
- 실제 AI Strategy/Risk/Execution Engine
- Wallet / Deposit / Withdraw / KYC / AML
- Admin 2FA/IP 제한과 실제 Kill Switch 동작
- Vercel 환경변수 연결 및 최종 배포 상태/런타임 검증
- E2E 테스트와 최종 Audit

## 운영 원칙
- REAL 기능은 법률/컴플라이언스 검토 전 활성화 금지
- 잔액은 프론트에서 직접 수정 금지
- 주문은 서버/RPC + idempotency + ledger를 통해서만 처리
- 시세 공급 중단 시 신규 주문 중지
- AI 판단 로그는 실제 시스템 이벤트로만 생성
