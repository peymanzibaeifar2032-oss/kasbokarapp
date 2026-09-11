# Section 77 audit — Kasbokar vs Master Specification

Baseline: `c130aec3d592d348682646ce79fe3284fdca8d18`

Statuses: **EXISTS** / **PARTIAL** / **MISSING** / **NEEDS REFACTOR**

## A. Repository + production

| Area | Finding |
|---|---|
| VPS Production | Docker `web`+`db`+`caddy`+`backup`. GitHub main auto-deploy (`watch-main` + `release.sh`) |
| Sandbox leftovers | `startup.sh`, `netlify.toml`, `vercel.json`, `render.yaml`, `@netlify/*`, grok-pwa, `src/lib/app-data` (Grok connectors). Not used when `STANDALONE=true` |
| Encrypted TLS bundle | `deploy/le-bundle.enc` was in git (one-time install). Phase 0 removes it |
| God files | `writes.ts` ~554 lines, `api.ts` ~621, `index.tsx` ~593 — all domain logic in two modules |
| Seed | `migrations/0003_seed.sql` + demo reviews. Do **not** delete; likely the live 12 businesses |
| Test rows | smoke creates `E2E TEST - DELETE ME` and `smoke*@kasbokar.local`; smoke.sh deletes the business at end |

## B–C. Requirement matrix

| Spec | Topic | Status | Notes |
|---|---|---|---|
| 0 | Independence from Grok/xAI/OpenAI/Vercel/Netlify for core | **PARTIAL** | Standalone VPS works without them. Repo still vendors Netlify/Vercel/Grok preview plugins |
| 0 | Provider adapters (Map/Pay/SMS/Email/Push/Storage/Search/AI) | **PARTIAL** | Map is proxy-not-adapter. Mail has SMTP then Resend. Guide has xAI with FAQ fallback. No Pay/SMS/Push/Storage adapters |
| 2 | Domain modules | **NEEDS REFACTOR** | Single `dispatchSave` switch |
| 3 | Roles customer/owner/admin server-side | **PARTIAL** | `is_admin`, `owner_id`, session user. No RBAC tables |
| 4 | Customer 5-tab nav | **PARTIAL** | 5 tabs exist but labels are نقشه/دسته‌ها/ثبت/رزروها/پنل — not خانه/کشف/رزرو/ذخیره/حساب |
| 5 | Home speed / lazy map | **PARTIAL** | Map is in home; dynamic Leaflet import. Map can delay LCP. No section lazy-load |
| 6 | Local intent engine / ranking | **MISSING** | Sort is rating then created_at. No availability/distance/open ranking on server |
| 7 | Classic + NL search | **PARTIAL** | Classic `q`/city/category. No deterministic NL parser |
| 8 | Result card fields | **PARTIAL** | Photo/verified/next slot/price range incomplete |
| 9 | Business profile IA | **PARTIAL** | Profile + booking + reviews + neshan. No staff/portfolio/policies |
| 10 | Verification levels | **MISSING** | Only `approval_status` pending/approved/rejected |
| 11 | Duplicate/fake/claim | **MISSING** | |
| 12 | Professional booking + locking | **PARTIAL** | Service-less slot booking. Clash SELECT then INSERT — **no unique index / transaction**, race remains |
| 13 | Calendar day/week/month | **MISSING** | |
| 14 | Staff | **MISSING** | |
| 15 | Waitlist | **MISSING** | |
| 16 | Cancellation / no-show policy | **MISSING** | Status cancel only |
| 17 | Payments | **MISSING** | |
| 18 | Reviews verified vs general | **PARTIAL** | One review per user/business upsert. No verified-from-completed-booking. Owner cannot delete (good). No photo reviews |
| 19 | Review fraud | **MISSING** | |
| 20 | Portfolio | **MISSING** | No upload pipeline |
| 21 | Favorites persistent | **PARTIAL** | DB + localStorage sync. No collections |
| 22 | CRM | **MISSING** | |
| 23 | Rebooking | **MISSING** | |
| 24–27 | Loyalty / referral / promotions / last-minute | **PARTIAL** | `offer_text` string only |
| 28 | Notifications | **MISSING** | |
| 29 | Messaging | **MISSING** | |
| 30–31 | Analytics / health score | **PARTIAL** | `ownerStats` counts. No funnel/health |
| 32–33 | Onboarding wizards | **PARTIAL** | Single business form. Browse without login **EXISTS** |
| 34 | MapProvider + circuit breaker | **PARTIAL** | Proxy + timeout 7s + Esri fallback. No named adapter/health/circuit |
| 35 | Location privacy copy | **PARTIAL** | Geolocation on HTTPS; Persian errors. City selector **EXISTS** |
| 36 | PWA professional | **PARTIAL** | Grok-oriented PWA plugin; needs Kasbokar-owned SW/manifest audit |
| 37–38 | Native / store compliance | **MISSING** | No account deletion/export, terms, community guidelines routes |
| 39 | Auth email/password | **EXISTS** | Better Auth, hashed, standalone cookies. Reset needs SMTP/Resend env (**PARTIAL** if unset) |
| 39 | Brute-force / email verify / session revoke UI | **PARTIAL** | Better Auth defaults; no product-level lockout UI |
| 40 | Account center | **PARTIAL** | Bookings + saved. No privacy/security/delete |
| 41–42 | Admin + moderation queues | **PARTIAL** | `/admin` approve businesses. No report queue |
| 43 | OWASP | **PARTIAL** | Parameterized SQL, origin checks, security headers. No CSRF token on all POSTs beyond Better Auth. IDOR mostly owner checks. No upload = no upload XSS yet |
| 44 | Upload security | **MISSING** | No image upload |
| 45–47 | Perf budget | **NOT VERIFIED** | No Lighthouse from this runner |
| 48 | DB indexes / geo | **PARTIAL** | owner/cat/province. No GiST coordinates. N+1 rating subquery in list |
| 49 | Cache invalidation | **PARTIAL** | Caddy caches tiles/assets. No app cache layer |
| 50–52 | SEO slug/schema/sitemap/share | **PARTIAL** | `/business/$id` not slug. robots.txt exists. Fake schema avoided (good) |
| 53–55 | A11y / design system / UX states | **PARTIAL** | RTL, some empty states, no systematic a11y |
| 56 | Zero results suggestions | **MISSING** | |
| 57–58 | Trust / safety report-block | **MISSING** | |
| 59 | 7-day trial server-side | **EXISTS** | `VISIBLE_SQL` + visibility tests |
| 60 | Growth loops | **PARTIAL** | Core loop exists without loyalty/referral |
| 61–62 | AI optional | **PARTIAL** | Guide FAQ works without xAI. No tool-constrained AI search |
| 63–65 | Observability / product analytics / funnel | **MISSING** | json logs in a few places; no metrics |
| 66 | Feature flags | **MISSING** | |
| 67 | Tests | **PARTIAL** | Unit + VPS smoke. No Playwright booking E2E in CI |
| 68 | Iran/international matrix | **PARTIAL** | Iran mobile historically tested by owner. Outside-Iran map **NOT VERIFIED** post c130aec on a real device |
| 69 | Deploy backup/smoke/rollback | **EXISTS** | `release.sh` |
| 70 | Git discipline | **EXISTS** | this process |
| 75 | Swap providers without core rewrite | **NEEDS REFACTOR** | Map closest; others inline |

## D. Dependency map

| Layer | Production today | Swappable? |
|---|---|---|
| Hosting | ParsPack VPS + Docker | Yes (compose). Repo still has Netlify/Vercel files |
| Database | PostgreSQL 16 volume | Yes |
| Auth | Better Auth + pg | Yes internally. Grok OAuth **disabled** when STANDALONE |
| Maps | `/api/tiles` → Esri then OSM.de/fr | Proxy yes; no MapProvider interface |
| Storage | None (no uploads) | N/A |
| Email | SMTP then Resend | Partial adapter in `mail.ts` |
| SMS | None | Missing |
| Push | None | Missing |
| Payments | None | Missing |
| AI | Optional xAI; FAQ fallback | Partial (`guide/provider.ts`) |
| CDN | None (origin Caddy) | N/A |
| DNS | ParsPack DNS A → VPS | Manual |
| TLS | Let's Encrypt files on disk | File-based; ACME from VPS blocked |

## E. Future DB changes (do **not** migrate in Phase 0)

- `bookings`: unique `(business_id, slot_start)` where status active; `staff_id`; `service_id`; advisory lock
- `services`, `staff`, `staff_services`, `staff_hours`
- `business_verification`, `business_reports`, `claims`
- `waitlist`, `cancellation_policies`
- `payments`, `payment_events` (idempotent keys)
- `review_flags`, `verified_from_booking_id`
- `media_objects`
- `messages`, `notifications`, `notification_prefs`
- `loyalty_*`, `referrals`, `promotions`
- `audit_logs`
- `businesses.slug`, GiST `geography(Point)`
- `feature_flags`

## F. Production risks

1. Double-booking race (check-then-insert)
2. Encrypted private key was in git (`le-bundle.enc`) — remove
3. Iran-access: GitHub/sandbox cannot SSH; LE HTTP-01 impossible
4. Map upstream hang if timeout regresses
5. `writes.ts`/`api.ts` god objects — regressions
6. First signup can become admin (`not exists is_admin`)
7. Password reset dead until SMTP/Resend env (no secret in chat)
8. Seed businesses mixed with real data — never wipe `biz-*` blindly
9. Hardcoded `185.204.197.211` in Caddy/auth origins
10. No account deletion (store compliance later)

## G. Roadmap

| Phase | Scope |
|---|---|
| **0** | Audit, baseline docs, backup verify, remove key bundle, safe E2E leftover SQL, health SHA |
| **1** | Security (booking lock), MapProvider interface (keep Esri adapter), auth rate-limit, split domains, perf |
| **2** | Verification, profile completeness, search ranking, NL parser without AI |
| **3** | Services, staff, calendar, waitlist, transactional booking |
| **4** | Verified reviews, fraud flags, moderation |
| **5** | CRM, notifications, messaging, rebooking |
| **6** | PaymentProvider + deposits + no-show |
| **7** | Loyalty, referral, last-minute marketplace |
| **8** | Analytics, health score |
| **9** | SEO slugs, a11y, PWA, store-ready policies |
| **10** | AI search + assistant behind flags, FAQ remains if AI down |

## H. Phase 0 vs Phase 1 touch list

**Phase 0 (this change):** `docs/*`, `deploy/le-bundle.enc` removal, `deploy/phase0-cleanup.sh`, health `sha`, Dockerfile/`release.sh` GIT_SHA. No DNS, no Esri swap, no auth replace, no UI redesign, no paid providers, no destructive PG.

**Phase 1 later:** `src/lib/map/*`, `src/lib/server/writes.ts` booking lock + unique index (compat), `src/lib/auth/*` rate limit, new `src/lib/providers/*` stubs, Caddy/security headers, home map lazy further.
