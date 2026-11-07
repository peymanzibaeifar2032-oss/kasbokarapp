# Pocket backend (PR #9) — owner export, finance, trainees, analytics

## Owner export (`studioPocketExport`, `studioPocketAccess`)
- Auth: verified session → `studioActor` (session user's email == studio owner) → `requireAdmin`. Checked before any query. Request payload never grants owner.
- Bookings (`pocket-bookings-export.ts`): `tattoo_requests` status=booked + live `bookings`. Includes `paidToman` (panel running total), `remainingToman` = max(0, price_min − paid) (same formula as panel `tattooBalance`), deposit, sessions, phone2, Instagram.
- Trainees: `studio_apprentices` + `studio_apprentice_payments` (owner user_id only): sessions done/goal, paid, debt.
- Finance: `tattoo_payments` (income) + `studio_expenses` (owner) + open receivable → income/expense/balance/current month.

## SMS
The site panel does not store a sent-SMS history for customers: its SMS buttons open the phone's SMS app with
template text (`tattoo-flow.ts`: confirm, deposit card, balance, prep, food, aftercare, reminder) filled from the
job data. The app uses the same templates; they work once the export above supplies name/phone/paid/price.
Nothing is imported or invented; there is no server SMS log to sync.

## Analytics provenance
- `downloads`: server-observed — counted only when this server actually serves the APK, max 1/IP/hour. Downloads from Netlify mirrors are not counted.
- `installs` / accounts: self-reported by the app (anonymous route: rate-limited 20/IP/hour, strict id format, never binds an email; email bound only via signed-in save action from the session).
- `monthlyRevenue`: self-reported cash-box totals of signed-in accounts (session email must match). Not verified income.

## Deploy
Merge PR, deploy, run migration `0058_app_analytics.sql` (additive: create table/index if not exists). Rollback: revert the commit; the new tables can stay unused.
