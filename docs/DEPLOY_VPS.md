# Deploy wedding-planner on ai-vaerksted.cloud

**Last updated:** 2026-03

Stack matches other apps on the VPS: **Docker + Traefik** (TLS), path **`/wedding-planner/`**. The app is a **static Vite SPA**; this image uses **nginx** only (no backend).

## 1. Repo on the server

```bash
ssh root@72.61.179.126
cd /opt/ai-vaerksted
git clone https://github.com/markbjerre/wedding-planner.git
# or pull if already present
```

## 2. Secrets for the Docker build

Vite bakes `VITE_*` into the JS at **build** time. On the host, set (e.g. in `/root/.env` next to compose, or CI secrets):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (passed into the image as `VITE_SUPABASE_ANON_KEY` at build time)

On the shared VPS, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be the **same Supabase project** (same values as Finnish / ella-mark-wedding). A mismatched anon/publishable key from another project yields **Invalid API key** in Layout → Cloud sync.

### Supabase SQL migrations

In the Supabase SQL editor, run in order:

1. `supabase/001_wedding_planner_layouts.sql` — one layout row per user (cloud sync).
2. `supabase/002_wedding_planner_layout_shares.sql` — shared projects (invite codes + RLS so collaborators can read/update the owner’s layout).
3. `supabase/003_wedding_planner_profiles.sql` — display names for shared project lists (optional but recommended).

Without (2), **Layout → Shared projects** will fail when generating or redeeming invites. Without (3), display names fall back to short user ids until you run the migration.

## 3. Add service to docker-compose (same file as housing/finnish)

Append something like:

```yaml
  ai-vaerksted-wedding-planner:
    build:
      context: /opt/ai-vaerksted/wedding-planner
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
    image: ai-vaerksted-wedding-planner:latest
    container_name: ai-vaerksted-wedding-planner
    restart: unless-stopped
    networks:
      - default
    labels:
      - traefik.enable=true
      - traefik.http.routers.wedding-planner.rule=Host(`ai-vaerksted.cloud`) && PathPrefix(`/wedding-planner`)
      - traefik.http.routers.wedding-planner.entrypoints=websecure
      - traefik.http.routers.wedding-planner.tls.certresolver=mytlschallenge
      - traefik.http.services.wedding-planner.loadbalancer.server.port=80
```

**Do not** use `StripPrefix` here: the browser loads `/wedding-planner/assets/...`; nginx must see the full path.

Router **priority**: if `/` catches everything, ensure the wedding-planner rule is more specific (Traefik usually orders by rule length; adjust `priority` if needed).

## 4. Build and run

```bash
cd /root   # or wherever docker-compose.yml lives
docker compose build ai-vaerksted-wedding-planner
docker compose up -d ai-vaerksted-wedding-planner
```

## 5. Verify

```bash
curl -sI https://ai-vaerksted.cloud/wedding-planner/ | head -5
curl -sI https://ai-vaerksted.cloud/wedding-planner/assets/ | head -3
curl -s https://ai-vaerksted.cloud/wedding-planner/health
curl -s https://ai-vaerksted.cloud/wedding-planner/health.json
```

Health checks: **`/wedding-planner/health`** returns JSON from nginx; **`/wedding-planner/health.json`** is the static file from the build (same payload).

**Local tests:** `npm run test` (Vitest), `npm run test:e2e` (Playwright; starts Vite on 5173, or set `CI=1` to force a fresh server in CI). **Layout JSON CLI** (dev machine): `npm run cli` — see [CLI.md](./CLI.md).

Open the app in a browser; sign-in under **Layout → Cloud sync** if using Supabase.

## 6. Supabase Auth URLs

In Supabase Dashboard → Authentication → URL configuration, add:

- Site URL: `https://ai-vaerksted.cloud/wedding-planner/` (or your canonical URL)
- Redirect URLs: same + `http://localhost:5173/wedding-planner/` for local dev

## Alternative: no Docker

Build `npm run build` locally or in CI, `rsync` the `dist/` tree to the server under a path that nginx serves as `/wedding-planner/` (same `alias` + `try_files` idea as in `deploy/nginx.conf`).
