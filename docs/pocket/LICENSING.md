# Pocket app manual licensing — threat model & design (1.15.0)

Scope: owner-controlled activation codes and signed, dated offline licenses for the "تقویم نوبت" APK.
No payments, subscriptions, prices or gateways. No telemetry/revenue derived from licenses.

## Threats considered
| Threat | Mitigation |
|---|---|
| Forged/edited license (extend dates, other device) | ES256 signature over the whole payload; APK pins public key(s) by `kid`; client checks v/iss/aud/kid/lid/dev/nbf/exp/olu. Unknown kid ⇒ reject. Keys are never read from JSON/backup/server responses at runtime. |
| Private key leak | Key never in APK/repo/public folder/export/log. Either runtime env `POCKET_LICENSE_SIGNING_KEY_PEM`, or generated once on the server and stored AES-256-GCM wrapped with an HKDF key derived from the runtime secret (`POCKET_LICENSE_KEY_SECRET` or existing `BETTER_AUTH_SECRET`). DB dumps alone hold only ciphertext. If the secret changes the server fails closed (no silent re-key). |
| Code guessing / brute force | 100-bit CSPRNG codes (20 Crockford base32 chars); stored only as keyed HMAC; unknown and revoked codes return the same `invalid`; 10 activation attempts / 10 min / IP (in-process limiter). Codes are never logged. |
| Sharing one code on many phones | Per-license device cap (default 1, owner editable 1–20), enforced on the server with a single conditional `UPDATE … where active_devices < max_devices` (atomic). |
| Device binding with hardware IDs | Device id = SHA-256 of a random 256-bit install secret created on first launch (no IMEI/Android ID/MAC). Server stores only an HMAC of it. |
| Unauthorised issue/list/renew/revoke | Only via `/api/save` with a verified session, same-origin check, and existing owner checks (studioActor owner + requireAdmin). Payload identity ignored. Anonymous ⇒ 401, non-owner ⇒ 403. No typed-email gate. |
| Clock rollback offline | Server time is the source (`iat`). App records max trusted time and rejects >10 min rollback. Honest limit: a rooted/modified APK can bypass any offline check. |
| Revocation while offline | Takes effect at the next online refresh or at `olu` (offline-until = min(expiry, now + lease)). Lease default 72 h, owner-configurable 1–168 h. No instant offline revocation is promised. |
| Lockout of the owner | Signed-in owner gets a self license (`pocketLicenseSelf`) bound to their device; not revocable from the panel. |
| Data loss on lock | Expired/invalid/revoked never deletes data. Read-only view, calls/SMS/WhatsApp, JSON/PDF export always work. Only data-changing actions (add/edit/delete, JSON import, server download-merge) need a valid license. |
| Global kill switch | None. Old APK releases are unaffected; policy applies only to 1.15.0+. |

## Endpoints
- `GET /api/pocket-license` → public keys only.
- `POST /api/pocket-license` `{op:"activate", code, device, label?}` / `{op:"refresh", token, device}` (cookie-less, rate limited).
- `/api/save` owner actions: `pocketLicenseList|Issue|Update|Revoke|ReissueCode|ReleaseDevice|Self`.
- Owner panel: https://kasbokarapp.com/studio/licenses

## Token
`base64url(JSON payload).base64url(P1363 ECDSA-P256-SHA256 sig)`; payload `{v,iss,aud,kid,lid,dev,iat,nbf,exp,olu,self,n}`.

## Rotation
New key = new `kid`. Ship an APK pinning old+new kids first, then switch the server slot. Migration 0059 is additive.
