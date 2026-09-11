# ADR 0001 — TLS renewal for Kasbokar Production

**Status:** Accepted as design. **Not implemented** on live TLS until explicit approval.

**Context:** Production uses file-based Caddy certificates (`tls /certs/fullchain.pem /certs/privkey.pem`, `auto_https off`). Current cert `055D352D…` expires 2026-12-10. Caddy does not renew file PEMs. `caddy reload` does not re-read replaced PEMs; the container must be recreated.

**Invariant:** the live private key never leaves the VPS, Git, chat, CI, or logs.

## Decision drivers

- Let's Encrypt HTTP-01 from Iranian VPS has been unreliable (validators must reach port 80).
- This VPS *can* reach `acme-v02.api.letsencrypt.org` (revoke returned HTTP 200).
- ParsPack DNS is edited in a web panel; no API credentials exist in the project.
- Manual CSR-split worked and is the emergency path.

## Option A — TLS-ALPN-01 (Caddy automatic HTTPS)

Caddy proves control of the hostname on port 443 with ALPN `acme-tls/1`. Private key stays inside Caddy/VPS.

| | |
|---|---|
| Security | Keys on VPS. No chat. Standard ACME |
| Reliability from Iran | Unknown. Needs Let's Encrypt to complete a TLS handshake to `185.204.197.211:443`. Public HTTPS works today, so this is the best candidate for unattended renew |
| Secrets | ACME account email only (`CADDY_EMAIL`). No DNS token |
| Failure mode | If ALPN-01 fails, Caddy may keep the last good cert or fail issuance. Must not wipe file certs until ALPN-01 is proven |
| Rollback | Keep current PEM files and `Caddyfile.tls`; recreate Caddy with file TLS |

**Do not switch Production to this without a test window and approval.**

## Option B — DNS-01 with ParsPack API

ACME writes `_acme-challenge` TXT via an official DNS API, if ParsPack (or a future DNS host) provides one.

| | |
|---|---|
| Security | API token is a secret. Store only on VPS env/secret storage. Never Git/chat |
| Reliability from Iran | High if the API is reachable from the VPS. Independent of inbound HTTP-01 |
| Secrets | DNS API token on the VPS |
| Failure mode | Token leak or API outage blocks renew; site keeps current cert until expiry |
| Rollback | Disable the DNS plugin; fall back to file PEMs |

**Blocked today:** no approved ParsPack API token, and none will be requested in chat.

## Option C — CSR-split (current emergency / manual fallback)

1. `deploy/tls-make-csr.sh` on the VPS (key never printed).
2. Public CSR only leaves the VPS.
3. DNS-01 TXT in ParsPack (human).
4. Public fullchain returns.
5. `deploy/tls-activate-next.sh` (match, backup, recreate Caddy, fingerprint, rollback).

| | |
|---|---|
| Security | Matches the incident remediation. Key never leaves the VPS |
| Reliability from Iran | Proven 2026-09-11 |
| Secrets | None in Git/chat |
| Failure mode | Needs a human for TXT. Not automatic |
| Rollback | Script restores `/root/kasbokar-tls-backup-*` (only a **non-compromised** successor backup) |

This remains the **fallback** until A or B is approved and tested.

## Monitor

`kasbokar-tls-monitor.timer` checks the *served* cert daily (45/30/14/7/3 day bands). It does not renew. Default notify adapter is local log (`deploy/notify.sh`). SMS/Email/Push can plug in later without changing Core.

## Public health

`GET /api/health` stays `{ok, app, db, standalone, sha}`. No serial, fingerprint, or key path. Host file `/var/lib/kasbokar/tls-status.json` holds `{status, days_left, checked_at}` for adapters.
