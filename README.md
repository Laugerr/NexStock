# NexStock — Warehouse Management System

> A production-grade Warehouse Management System built with Node.js, TypeScript, PostgreSQL, and React. Deployed serverless on Vercel + Supabase with a custom JWT + bcrypt + RBAC auth stack.

---

## Live Demo

**URL:** `https://nexstock.vercel.app` *(replace with your Vercel URL after deploying)*

> **Demo accounts — public credentials, rate-limited, throwaway data only.**
> These accounts exist for portfolio review. Do not store real data.
> Login attempts are rate-limited to 10/min per IP.

| Email | Password | Role |
|-------|----------|------|
| admin@nexstock.com | Admin@123! | Admin (full access) |
| manager@nexstock.com | Manager@123! | Warehouse Manager |
| picker@nexstock.com | Picker@123! | Picker |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify + TypeScript (serverless via Vercel) |
| ORM | Prisma 5 |
| Database | Supabase Postgres (free tier) |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + TanStack Query |
| Monorepo | TurboRepo + npm workspaces |
| Auth | Custom JWT + bcrypt (cost 12) + RBAC |
| Validation | Zod (request bodies + env vars) |
| Hosting | Vercel (serverless functions + static) |

---

## Architecture

### Deployed architecture (serverless)

```
Browser
  │
  ├── GET /*            → Vercel CDN (React SPA, static)
  └── POST /api/v1/*    → Vercel Serverless Function
                              │
                        Fastify (inject adapter)
                              │
                    ┌─────────┴──────────┐
                    │                    │
               Route handlers       Supabase Postgres
               Auth middleware       (Prisma, pooler)
               RBAC checks
               Audit logging
               Zod validation
```

### Why serverless, not a long-running server

The README previously described this as a "modular monolith". The domain structure is still modular (one folder per domain, service/route separation), but the **runtime** changed:

- **Before:** Fastify listening on a port, persistent process, Redis for rate limiting
- **After:** Fastify wrapped with an `inject()` adapter, running as a Vercel serverless function, Postgres-backed rate limiting

The domain modules (`auth`, `warehouses`, `products`, `inventory`, `stock-movements`, `audit`) are unchanged. The refactor only touched the runtime boundary — a single `api/index.ts` entry point that initialises Fastify once per warm instance and forwards Vercel requests via `fastify.inject()`.

### Monorepo structure

```
nexstock/
├── apps/
│   ├── api/                        # Fastify backend
│   │   ├── api/
│   │   │   └── index.ts            # Vercel serverless entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   ├── seed.ts             # Seed data
│   │   │   └── migrations/         # Prisma migration history
│   │   └── src/
│   │       ├── config/             # Env validation, DB
│   │       ├── plugins/            # CORS, JWT, helmet, rate-limit
│   │       ├── shared/             # Errors, middleware, utils, types
│   │       └── modules/
│   │           ├── auth/           # Login, register, JWT, RBAC
│   │           ├── users/          # User management
│   │           ├── warehouses/     # Warehouses, zones, locations
│   │           ├── products/       # Product catalog + SKU
│   │           ├── inventory/      # Stock levels
│   │           ├── stock-movements/# GRN, picks, transfers, adjustments
│   │           ├── grn/            # Goods receipt notes
│   │           ├── cycle-count/    # Cycle counting
│   │           ├── audit/          # Audit log
│   │           ├── reports/        # Reporting
│   │           └── health/         # Health check
│   └── web/                        # React + Vite frontend
│       ├── vercel.json             # SPA routing + security headers
│       └── src/
│           ├── components/         # UI components + layout
│           ├── hooks/              # TanStack Query hooks
│           ├── layouts/            # AppLayout, AuthLayout
│           ├── lib/                # API client, query client
│           ├── pages/              # Route-level pages
│           ├── router/             # React Router config
│           ├── store/              # Zustand auth store
│           └── types/              # Shared API types
├── packages/
│   ├── tsconfig/                   # Shared TypeScript configs
│   └── eslint-config/              # Shared ESLint config
├── vercel.json                     # Root: single-project deploy config
├── .github/
│   ├── workflows/                  # CI, CodeQL, Gitleaks, Trivy
│   └── dependabot.yml
└── turbo.json
```

---

## Security Controls

| Control | Implementation | Code |
|---------|---------------|------|
| Authentication | JWT (HS256), 7-day expiry, `Authorization: Bearer` header | [`src/plugins/jwt.ts`](apps/api/src/plugins/jwt.ts) |
| Password hashing | bcrypt, cost factor 12 | [`src/shared/utils/password.ts`](apps/api/src/shared/utils/password.ts) |
| RBAC | Permission check on every protected route (`action:resource`) | [`src/shared/middleware/authorize.ts`](apps/api/src/shared/middleware/authorize.ts) |
| Rate limiting | Postgres-backed, atomic SQL upsert — 10/min login, 5/min register, 120/min global | [`src/plugins/rate-limit.ts`](apps/api/src/plugins/rate-limit.ts) |
| Audit logging | Every state-changing action logs actor, IP, user-agent, before/after | [`src/modules/audit/audit.service.ts`](apps/api/src/modules/audit/audit.service.ts) |
| Input validation | Zod on every request body and query string | All `*.schema.ts` files |
| CORS | Env-configured origin allowlist, no wildcards in production | [`src/plugins/cors.ts`](apps/api/src/plugins/cors.ts) |
| Security headers | HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | [`src/server.ts`](apps/api/src/server.ts) |
| Env validation | Zod schema at startup; invalid config exits immediately | [`src/config/env.ts`](apps/api/src/config/env.ts) |
| Secret scanning | Gitleaks on every push/PR + local pre-commit hook | [`.gitleaks.toml`](.gitleaks.toml) |
| CVE scanning | Trivy (filesystem mode) on every PR, results in Security tab | [`.github/workflows/trivy.yml`](.github/workflows/trivy.yml) |
| CodeQL | OWASP Top 10 + security-extended queries on every PR | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) |

Full technical detail: [`docs/SECURITY_CONTROLS.md`](docs/SECURITY_CONTROLS.md)  
Threat model: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)

---

## Deployment

### Prerequisites

- GitHub account (repo must be pushed)
- [Supabase](https://supabase.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)

### Step 1 — Supabase

1. Create a new Supabase project. Save the database password.
2. In **Connect → ORMs**, copy both URLs:
   - `DATABASE_URL` — pooler URL (port 6543). Append `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — direct URL (port 5432). For local migrations only.
3. Locally, create `apps/api/.env` with both URLs plus a generated `JWT_SECRET`:
   ```bash
   openssl rand -base64 32   # use this as JWT_SECRET
   ```
4. Run migrations and seed:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   npm run db:seed
   ```

### Step 2 — Vercel (API project)

1. Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo
2. Configure:
   - **Root Directory:** `apps/api`
   - **Framework Preset:** Other
   - **Build Command:** *(leave empty)*
   - **Output Directory:** *(leave empty)*
3. Add environment variables (**use Sensitive/Secret type for JWT_SECRET**):

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | your Supabase pooler URL |
   | `JWT_SECRET` | your generated secret |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGINS` | your web app Vercel URL (set after step 3) |
   | `LOG_LEVEL` | `warn` |

4. Deploy. Note the API URL (e.g. `https://nexstock-api.vercel.app`).

### Step 3 — Vercel (Web project)

1. Go to [vercel.com/new](https://vercel.com/new) → Import the same repo
2. Configure:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Vite
3. Add environment variable:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | your API Vercel URL from step 2 |

4. Deploy. Note the web URL.

### Step 4 — Wire CORS

Go back to the **API** Vercel project → Settings → Environment Variables.  
Update `CORS_ORIGINS` to the web app URL from step 3. Redeploy.

### Step 5 — Verify

```bash
# Health check
curl https://nexstock-api.vercel.app/api/v1/health

# Login
curl -X POST https://nexstock-api.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexstock.com","password":"Admin@123!"}'
```

---

## Local Development

### Prerequisites
- Node.js >= 20
- Docker Desktop (for local Postgres)

### Setup

```bash
git clone https://github.com/Laugerr/NexStock.git
cd NexStock
npm install

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit apps/api/.env — set DATABASE_URL and JWT_SECRET

# Start local Postgres
docker compose up -d

# Run migrations and seed
cd apps/api
npx prisma migrate dev --name init
npm run db:seed
cd ../..

# Start dev servers
npm run dev
```

**API:** http://localhost:3001  
**Web:** http://localhost:5173  
**Health:** http://localhost:3001/api/v1/health

---

## API Reference

Base URL: `/api/v1`

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Sign in, returns JWT |
| GET | `/auth/me` | JWT | Current user + permissions |
| POST | `/auth/register` | Admin | Create user |

### Warehouses
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/warehouses` | JWT | List warehouses |
| POST | `/warehouses` | Admin/Manager | Create warehouse |
| GET | `/warehouses/:id` | JWT | Get warehouse with zones |
| PATCH | `/warehouses/:id` | Admin/Manager | Update warehouse |
| GET | `/warehouses/:id/zones` | JWT | List zones |
| POST | `/warehouses/:id/zones` | Admin/Manager | Create zone |
| GET | `/warehouses/zones/:zoneId/locations` | JWT | List locations |
| POST | `/warehouses/zones/:zoneId/locations` | Admin/Manager | Create location |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | JWT | List products |
| POST | `/products` | Admin/Manager | Create product |
| GET | `/products/:id` | JWT | Product with inventory |
| PATCH | `/products/:id` | Admin/Manager | Update product |
| GET | `/products/categories` | JWT | All categories |

### Inventory
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/inventory` | JWT | Current stock levels |
| GET | `/inventory/summary` | JWT | Dashboard stats |

### Stock Movements
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stock-movements` | JWT | List movements |
| POST | `/stock-movements` | JWT | Record movement |
| GET | `/stock-movements/:id` | JWT | Movement detail |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users |
| GET | `/users/:id` | Admin | User detail |
| PATCH | `/users/:id` | Admin | Update user |
| GET | `/users/roles` | JWT | Available roles |

### Audit
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit` | Admin | Audit log |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | — | Version, uptime, DB status |

---

## Development Commands

```bash
npm run dev              # Start all apps
npm run build            # Build all apps
npm run typecheck        # Type-check all apps
npm run lint             # Lint all apps
npm run format           # Format with Prettier

# In apps/api:
npm run db:migrate       # Run pending migrations
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset DB + re-migrate
```

---

## Free-Tier Limitations

| Limitation | Detail |
|-----------|--------|
| Cold starts | First request after inactivity: ~500–1500 ms. The frontend retries automatically. |
| Supabase pause | Free Supabase projects pause after 7 days of inactivity. Resume from the dashboard. |
| Vercel function timeout | Max 10 s execution per request on hobby plan. |
| Connections | Supabase free tier: ~60 concurrent connections. Mitigated by `connection_limit=1` in the pooler URL. |
| No Redis | Rate limiting uses Postgres. Slightly higher latency per request than in-memory. |

---

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 1 — Core Foundation** | ✅ Complete | Auth, RBAC, warehouses, products, inventory, stock movements, audit |
| Phase 2 — Business Operations | Planned | POs, sales orders, wave picking, supplier portal, notifications |
| Phase 3 — Advanced Operations | Planned | Multi-warehouse, cross-docking, ERP integrations, SLA tracking |
| Phase 4 — Pro / Platform | Planned | Robotics, AI optimisation, IoT, blockchain traceability |

---

## License

MIT
