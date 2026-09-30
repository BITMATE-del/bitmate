# BITMATE Supabase Phone Auth + Twilio setup

BITMATE signup uses the existing Supabase Auth user. No separate member table or client-side Twilio secret is required.

## Supabase Dashboard

Project: `fgyiofykvpkxpeylcocn`

1. Open **Authentication → Providers → Phone**.
2. Enable Phone authentication / phone signups.
3. Select **Twilio** as the SMS provider.
4. Enter the Twilio values in Supabase Dashboard only:
   - Account SID
   - Auth Token
   - Messaging Service SID / configured sender required by the Dashboard
5. Keep the OTP length at 6 digits.
6. Keep the minimum resend period at 60 seconds or stricter.
7. Review **Authentication → Rate Limits** and keep SMS/OTP limits conservative for the initial small-scale launch.

Do not commit Twilio credentials to GitHub and do not expose them through `NEXT_PUBLIC_*` variables.

## SMS template

Use the Supabase Phone SMS template:

```text
[BITMATE]
휴대폰 인증번호는 {{ .Code }}입니다.
인증번호를 타인에게 공유하지 마세요.
```

## Signup flow

1. User enters email, password and Korean phone number.
2. `010-1234-5678` is normalized to `+821012345678`.
3. BITMATE calls Supabase Phone Auth to send the SMS.
4. Supabase Auth sends the OTP through the configured Twilio provider.
5. User enters the 6-digit OTP.
6. Successful `verifyOtp(..., type:'sms')` sets `auth.users.phone_confirmed_at`.
7. BITMATE attaches the email/password to that same Supabase Auth user.
8. If email confirmation is enabled, the user must confirm the email before normal email login.

## Abuse protection

The client enforces:
- 60-second resend cooldown
- duplicate-send button lock while a request is running
- maximum 5 send attempts per phone number per hour in the same browser

Supabase Auth remains the authoritative server-side rate limiter. Configure project-level OTP limits in **Authentication → Rate Limits**.

## Verification status

Member Center reads:
- `email_confirmed_at`
- `phone_confirmed_at`

Admin member screens receive the same fields through `admin_ops_snapshot()`.
