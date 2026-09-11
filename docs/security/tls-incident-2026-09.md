# TLS security incident log — September 2026

Status: **closed for Production**. Live certificate is serial `055D352DBC35556738B9A84FAFECB2E579CF`. Do not rotate it again unless a new incident requires it.

## 1. Compromised Production certificate (revoked)

| Field | Value |
|---|---|
| Serial | `0534683C20B8888A21D29D7A0FEBE665E9A0` |
| Fingerprint SHA-256 | `09:95:3E:35:D7:20:4C:7E:87:78:78:5C:6F:28:95:3D:51:74:D0:91:0D:05:AD:86:4F:1F:A2:20:94:8F:B5:A7` |
| Why compromised | Private key was inside `le-bundle.enc` in Git history; decrypt passphrase appeared in chat |
| Action | Replaced via CSR-split (key generated on VPS). Revoked at Let's Encrypt `ACME_STATUS 200` on 2026-09-11 |
| Backups | `/root/kasbokar-tls-backup-*` kept until 2027-03-11, marked `DO_NOT_USE`. Never install as live TLS |

## 2. Unused certificate (not revoked)

| Field | Value |
|---|---|
| Serial | `06DBA73529FC2E0FF831698732226325318E` |
| Fingerprint SHA-256 | `29:E9:24:D6:1D:C7:E2:73:23:60:D9:42:70:A9:7D:FE:9C:AC:27:77:61:63:2D:EF:CA:B9:92:6B:C9:76:9D:22` |
| Status | **ISSUED** |
| Deployed | **NEVER DEPLOYED** |
| Key | **PRIVATE KEY / PASSPHRASE PATH CONSIDERED COMPROMISED** |
| Policy | **DO NOT USE** |

RFC 8555 allows revoke only with the issuing ACME account key or the certificate private key. Both are gone (ephemeral account, shredded key). No new secret will be created in chat to force a revoke. Let it expire (~2026-12-10). It never served Production traffic.

## 3. Live certificate (do not change)

| Field | Value |
|---|---|
| Serial | `055D352DBC35556738B9A84FAFECB2E579CF` |
| Fingerprint SHA-256 | `64:88:A7:E9:93:CB:2E:8E:6B:FC:0A:24:6D:72:DE:4B:E1:3A:5C:E9:71:44:FB:BF:3D:F6:2C:69:2B:06:61:8B` |
| Issuer | Let's Encrypt YR1 |
| SAN | `kasbokarapp.com`, `www.kasbokarapp.com` |
| notAfter | 2026-12-10 19:44:45 GMT |
| Private key | Generated on the VPS; never left the VPS; never printed |

## 4. Retired artifacts

- `/root/le-rotate.enc` — invalid attempt; shred on VPS if present
- `deploy/tls-rotate-vps.sh` — exits `RETIRED_DO_NOT_USE`
