# WasteWatch AI

AI-assisted waste reporting and collection management. React + TypeScript (Vite) client, Express + TypeScript API, MongoDB (Mongoose), Leaflet + OpenStreetMap.

**Roles:** citizen → reports waste · collector → works tasks, submits before/after photos, plans routes · supervisor → assigns tasks, verifies cleanups, analytics · admin → everything + user roles.

## Setup

Requirements: Node 20+ (22 recommended), MongoDB 6+ (or `docker compose up -d` for a local one).

```bash
cp .env.example .env          # then edit: set JWT_SECRET, SEED_ADMIN_*
npm install                   # installs both workspaces
npm run seed                  # creates the admin (and demo data if SEED_DEMO=true)
npm run dev                   # API :4000 + web :5173  → open http://localhost:5173
npm test                      # server unit tests
npm run build && npm start    # production: API also serves client/dist
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Demo data (optional): set `SEED_DEMO=true` and `SEED_DEMO_PASSWORD`, run `npm run seed` (`-- --reset` to recreate). It creates `supervisor@`, `collector@`, `citizen@demo.test` and 8 reports/2 tasks, all flagged **Sample** in the UI. Remove with `npm run seed -- --reset` after switching `SEED_DEMO` off, or delete `isSample` documents.

## External services (all optional, all server-side)

| Feature | Env var | Provider | When not configured |
|---|---|---|---|
| AI detection | `GOOGLE_VISION_API_KEY` | Google Cloud Vision label detection | UI says "AI detection unavailable". With `AI_DEMO_MODE=true`, results are labelled **DEMO – not analysed** and contain no prediction |
| Routing | `OSRM_BASE_URL` | OSRM `/trip` (self-host recommended) | Route is labelled **SIMULATED** (nearest-neighbour, straight lines, straight-line distance) |
| Satellite | `MAPBOX_ACCESS_TOKEN` | Mapbox Static Images (satellite-v9), proxied by the API | "Satellite imagery unavailable" |

The browser never sees these keys; `/api/capabilities` exposes only booleans and provider names. Map tiles are OpenStreetMap's public tile server — fine for development, but review the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) or use a tile provider for production.

AI note: Vision returns generic image *labels*, not a purpose-built waste detector. The app shows the labels, whether any match waste-related terms, and a *suggested* category — the reporter's chosen category is what's stored. For better accuracy, swap `server/src/services/ai.ts` for a custom-trained model (the `AiResult` shape is the contract).

## Architecture notes

- **Auth:** JWT (7 days) + bcrypt. The user is re-loaded from the DB on every request, so role changes apply immediately. Public registration only creates citizens.
- **Authorization:** one permission matrix (`server/src/lib/permissions.ts`) enforced by middleware; collectors can only touch their own tasks; citizens only see their own reports (the map feed omits reporter and AI details).
- **Workflow:** report → supervisor assigns task (deadline) → collector starts → uploads before+after → supervisor approves (report resolved) or rejects with a comment (back to in-progress). State changes use atomic conditional updates to avoid double-processing.
- **Uploads:** memory → magic-byte check (JPEG/PNG/WebP) → random filename stored as a separate MongoDB document so uploads survive Render restarts. Uploaded files are served at `/uploads/<random>` without auth (unguessable names); keep per-file limits below MongoDB's 16 MB document limit or move to object storage for larger media.
- **Analytics:** computed server-side from stored records only; empty data yields zeros/empty states.
- **Validation:** hand-written, dependency-free validators (`server/src/lib/validators.ts`); field errors are shown inline.

## Tests

`npm test` runs 33 `node:test` unit tests (geo/clustering/ordering, validators, permission matrix, image sniffing, AI-label mapping, analytics).

## Known limitations

- No API/integration tests or client tests yet (they need a MongoDB instance / extra dev dependencies). Add Supertest + `mongodb-memory-server` and Vitest next.
- No pagination beyond hard caps (300 list rows, 1000 map points); analytics loads all reports into memory — fine for a prototype, not for large datasets.
- Notifications are in-app and polled every 30 s (no push/email/websocket).
- No password reset, email verification, or refresh tokens. JWT is stored in `localStorage`.
- Routing assumes OSRM's driving profile; no time windows, capacity or vehicle constraints. The simulated route is a heuristic, not an optimum.
- Satellite imagery is a static, possibly outdated snapshot; there is no change-detection.
- Rate limiting covers login/register only.
