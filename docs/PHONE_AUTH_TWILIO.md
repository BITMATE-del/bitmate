# BITMATE Phone Auth / Twilio setup

BITMATE uses the existing Supabase Auth user as the single account source. No separate member table is introduced.

## Supabase Dashboard

Project: `fgyiofykvpkxpeylcocn`

Open **Authentication → Providers → Phone** and:

1. Enable Phone provider / phone signup.
2. Enable phone confirmations so signup sends an SMS OTP.
3. Select **Twilio** as the SMS provider.
4. Enter the Twilio Account SID, Auth Token, and Messaging Service SID/Sender in the Supabase Dashboard.
5. Keep OTP length at 6 digits.
6. Keep the minimum resend interval at 60 seconds or stricter.
7. Configure Auth rate limits / CAPTCHA as appropriate for production.

Do not put the Twilio Auth Token in Next.js, Vercel public env vars, or client code.

## SMS template

Use the Supabase Auth SMS template:

```text
[BITMATE]
휴대폰 인증번호는 {{ .Code }}입니다.
인증번호를 타인에게 공유하지 마세요.
```

## Phone normalization

Korean input:

`010-1234-5678`

is normalized before Supabase Auth requests to:

`+821012345678`

## Client controls

- 60 second resend countdown.
- Prevent duplicate clicks while an OTP request is in flight.
- Up to 5 requests per phone per hour in local client throttling.
- Supabase Auth server-side rate limits remain the authoritative anti-abuse layer.
- OTP input uses `inputMode="numeric"` and `autocomplete="one-time-code"`.
- Signup completion remains disabled until Supabase returns a verified phone session.

## Verification source of truth

The UI and admin tools use Supabase Auth fields:

- `auth.users.email_confirmed_at`
- `auth.users.phone_confirmed_at`

These are surfaced to admin pages by `admin_ops_snapshot`.
