# AGENTS.md — Multi-Vendor ERP

## Architecture

Three independent apps in one repo, sharing no code at runtime:

| App | Port | Framework | Module System |
|-----|------|-----------|---------------|
| `backend/` | 5000 | Express.js + Prisma | CommonJS (`require`) |
| `admin/` | 3001 | Next.js 15 (App Router) | ES Modules (`import`) |
| `storefront/` | 3000 | Next.js 15 (App Router) | ES Modules (`import`) |

Infrastructure: PostgreSQL 15 + Redis 7 + Nginx reverse proxy (Docker Compose).

## Essential Commands

```bash
# Start everything (concurrently)
npm run dev

# Start a single app
npm run dev:backend
npm run dev:admin
npm run dev:storefront

# Database (run from backend/)
npx prisma db push          # push schema changes
npx prisma migrate dev      # create migration
npx prisma generate         # regenerate Prisma Client
node prisma/seed.js         # seed demo data

# Lint (runs admin + storefront lint sequentially)
npm run lint

# Build (admin then storefront, sequentially)
npm run build
```

**Order matters**: `prisma generate` → `prisma db push` → seed. Frontend apps need backend running.

## Adding a Backend Module

1. Create `backend/src/modules/<name>/<name>.routes.js` (one file per module).
2. Register it in `backend/src/app.js` with `app.use("/api/v1/<path>", require("./modules/<name>/<name>.routes"))`.
3. Place sub-resource routes before catch-all routes (e.g., `/api/v1/inventory/receive` before `/api/v1/inventory`).
4. Use the standard middleware stack: `authenticate`, `requirePermission`, `validate`, `audit`.

## API Routing

Requests reach the backend two ways:
- **Production (Nginx)**: `/api/*` → `backend:5000` (rate limited 30r/s burst 50). `/admin` → `admin:3001`. `/` → `storefront:3000`.
- **Dev (Next.js rewrites)**: Both `admin/next.config.js` and `storefront/next.config.js` rewrite `/api/v1/*` to `http://localhost:5000/api/v1/*`.

Response format is always:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": [...] } }
```

Validation uses **Zod** on both backend (middleware `validate(schema)`) and frontend. Backend validates env vars on startup with Zod and exits if invalid.

## Backend Module Pattern

Every module in `backend/src/modules/<name>/` follows the same structure:

```js
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { audit } = require("../../middleware/audit");

router.get("/", authenticate, requirePermission("product.read"), async (req, res, next) => { ... });
```

- Auth: `authenticate` middleware (JWT access/refresh tokens via cookies `erp_access`/`erp_refresh` or `Authorization: Bearer` header). Uses `jose` library (not `jsonwebtoken`).
- RBAC: `requirePermission("module.action")` — wildcard `*` grants all. Also has `requireAnyRole()`.
- Validation: `validate(zodSchema)` on `req.body` by default, pass `"query"` as second arg for query params.
- Audit: `audit("action")` middleware logs to `AuditLog` table.

Error classes: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError` — all from `backend/src/utils/errors.js`.

Dev server uses `node --watch` (not nodemon). JSON body limit is 10mb.

## Admin App State Management

Uses **Redux Toolkit** with multiple RTK Query API slices:
- `admin/store/api/baseApi.js` — base API with tag types and auto-reauth on 401
- Additional slices in `admin/store/api/slices/` (posApi, auditApi, suppliersApi, purchaseOrdersApi)
- Auth state in `admin/store/slices/authSlice.js` (stores `accessToken` in localStorage as `erp_access_token`)

API client: `admin/lib/api.js` — handles 401 redirects, FormData for uploads.

## Storefront

Simpler than admin. No Redux. Uses plain `fetch` via `storefront/lib/api.js`. Customer-facing routes live under `/store/*`, account routes under `/account/*`.

## Prisma Schema Key Points

- `backend/prisma/schema.prisma` — single source of truth for DB
- Uses `cuid()` for all IDs (string PKs, not auto-increment)
- Decimal fields use `@db.Decimal(12,2)` for money, `@db.Decimal(5,2)` for percentages
- Many-to-many relations are explicit join tables (e.g., `UserRole`, `RolePermission`)
- Indexes are declared in `@@index([...])` blocks
- Enums are defined at top of schema file
- PrismaClient is a singleton via `globalThis` in `backend/src/config/database.js`

## Environment

Backend requires `backend/.env` (copy from `.env.example`). Critical vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — min 8 chars each
- Redis is non-fatal: server starts without it, logs a warning

Frontend apps read `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api/v1`).

## Testing

No test framework is currently configured. CI pipeline (`.github/workflows/ci-cd.yml`) runs only lint and build. When adding tests, follow whatever framework is adopted and keep them co-located or in a `__tests__` directory.

## Conventions

- Backend: CommonJS, `snake_case` for DB columns, `camelCase` for JS variables
- Frontend: ES Modules, React 19, Tailwind CSS, `clsx` + `tailwind-merge` for class merging
- Route files: `<module>.routes.js` — single file per module
- Slugs are auto-generated via `slugify` with `strict: true`
- Order/PO/Invoice numbers: auto-generated with date prefix (`ORD-20241115-A3F2BC`)
- Currency is INR throughout (see `formatMoney` in `helpers.js`)
- File uploads: local by default (`public/uploads/`), S3 optional via `STORAGE_DRIVER=s3`
