# Kasbokar production baseline

**Rollback SHA:** `c130aec3d592d348682646ce79fe3284fdca8d18`

Do not treat `git reset --hard` as normal deploy. Use `deploy/release.sh` (backup, health, smoke, rollback on fail).

## Locked architecture

- Source of truth: GitHub `main`
- Runtime: ParsPack VPS + Docker Compose + PostgreSQL 16 + Caddy file TLS
- Map: `Client → /api/tiles → provider` (Esri is the current adapter, not a domain dependency)
- Auth: Better Auth email/password on this origin. No OpenAI/ChatGPT/Grok login in standalone
- Independent if all AI hosts vanish: login, search, profiles, map proxy, booking, reviews, favorites, dashboard, database

## Snapshot at lock (2026-09-11)

| Check | Value |
|---|---|
| `GET /api/health` | `ok:true`, `db:postgres`, `standalone:true` |
| `GET /api/map-config` | `/api/tiles/{z}/{x}/{y}?v=3`, `proxy:true`, Esri fallback |
| HTTPS | `kasbokarapp.com` and `www` serve health JSON |
| `/account` | redirects to `/login?next=/account` |
| Public E2E name | not on homepage |

VPS journal `DEPLOY_OK` line: not readable from the sandbox runner (Iran-access). Public API fingerprint matches this SHA (`v=3`).
