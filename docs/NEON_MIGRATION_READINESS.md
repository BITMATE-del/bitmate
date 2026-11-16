# BITMATE — Supabase → dedicated Neon migration readiness

Status: **BLOCKED: source DB unavailable / destination provisioning restricted**. Do **not** change the production Vercel environment or direct clients to an empty database.

## Verified at assessment
- Source Supabase project: `fgyiofykvpkxpeylcocn`. PostgreSQL connection fails: SQLSTATE 57P03, database not accepting connections.
- Vercel Production remains deployed from GitHub main. Not yet migrated.
- Existing Neon projects belong to other applications. Do not reuse.
- Creating a new Neon project through the connected Neon organization failed: `action restricted; organization is managed by Vercel`.
- Frontend imports `createBrowserSupabase()` directly; login uses Supabase Auth and data screens use `.rpc()`, `.from()` and Auth sessions.
- Initial database migration references `auth.users(id)`. Many later SQL functions depend on `auth.uid()`, SECURITY DEFINER, RLS and PostgreSQL cron.
- Auth method migration must account for password resets and user ID / foreign-key preservation; **do not** assume password hashes or sessions can be transferred to Neon Auth.

## Staged cutover checklist (never skip)
1. Recover source database connectivity / secure consistent backup of schema, functions, roles, constraints, policies, data, Auth identity metadata, storage assets, cron jobs, and ledger records.
2. Create a **dedicated** BITMATE Neon project in supported region through Vercel-managed provisioning or separately authorized Neon organization.
3. Stage data import and adapt `auth.users` references, `auth.uid()` semantics, all RPCs, RLS, SECURITY DEFINER execution grants, scheduled workers, Storage, and realtime dependencies.
4. Implement new authentication, preserve or map user identities explicitly, plan password reset / verification and authorized dealer/admin roles. Test login, reset, session, test-account provisioning.
5. Replace browser-exposed Supabase data calls with server-side authenticated routes or carefully configured equivalent; keep all existing URL/UI workflows.
6. Backfill and reconcile user count, UUID mapping, wallet balances, ledger totals, active positions, withdrawals, deposits, loan collateral, CFD/futures settlements, dealer ownership and test accounts.
7. Freeze writes for a short controlled cutover window; copy final delta and verify every balance and open trade; switch Vercel production only after signed-off smoke and reconciliation tests.
8. Keep the old Supabase instance and snapshot intact for verified rollback. Never mutate historical financial ledger to force counts to match.

### Cutover blockers
- PostgreSQL source is presently inaccessible: cannot export application records or safely verify balances.
- New dedicated Neon project has not been provisioned by connector (organization restriction).
- No production environment variables were changed. No customer funds, database rows, or auth users were modified.
