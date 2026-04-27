<div align="center">

# 📦 NexStock WMS

**A production-grade Warehouse Management System built with security-first principles.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nexstock--wms.vercel.app-black?style=for-the-badge&logo=vercel)](https://nexstock-wms.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![CodeQL](https://img.shields.io/badge/CodeQL-Security%20Extended-8B5CF6?style=for-the-badge&logo=github)](https://github.com/Laugerr/NexStock/security/code-scanning)
[![Gitleaks](https://img.shields.io/badge/Gitleaks-Secret%20Scanning-red?style=for-the-badge)](https://github.com/gitleaks/gitleaks)
[![Trivy](https://img.shields.io/badge/Trivy-CVE%20Scanning-1904DA?style=for-the-badge)](https://github.com/aquasecurity/trivy)

</div>

---

## 🎯 What is NexStock?

NexStock is a full-stack WMS (Warehouse Management System) built as a **cybersecurity portfolio project**. It's not just about moving stock — it's about demonstrating how to build a production-ready system with a proper security architecture: threat modeling, RBAC, tamper-evident audit trails, rate limiting without Redis, and automated vulnerability scanning baked into CI/CD.

> Built by a **Cybersecurity Master's student** to showcase secure software engineering in a real-world full-stack context.

---

## 🚀 Live Demo

🌐 **[nexstock-wms.vercel.app](https://nexstock-wms.vercel.app)**

> 🔐 Demo access available on request — use the **Try a demo account** buttons on the login page to explore each role (Admin, Manager, Picker). Rate-limited to 10 login attempts/min.

---

## 🛠️ Tech Stack

### Backend
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=for-the-badge)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

### Infrastructure & Security
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge)

---

## 🔐 Security Architecture

> This section is the heart of the project. Every control was intentionally designed, not bolted on.

### 🗺️ Threat Model (STRIDE)

| Threat | Vector | Mitigation |
|--------|--------|------------|
| **Spoofing** | Credential stuffing on `/auth/login` | Postgres-backed rate limiting (10/min/IP), bcrypt cost 12 |
| **Tampering** | Modifying stock movements post-creation | Immutable audit log, no UPDATE/DELETE on movements |
| **Repudiation** | Denying warehouse actions | Tamper-evident audit trail: actor, IP, user-agent, before/after state |
| **Information Disclosure** | JWT leakage, env secrets in repo | HS256 JWT, Gitleaks pre-commit hook, Zod env validation at startup |
| **Denial of Service** | Flooding the serverless function | Global 120 req/min rate limit, 10s Vercel function timeout |
| **Elevation of Privilege** | Horizontal/vertical privilege escalation | RBAC on every route, `action:resource` permission model |

Full threat model: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)

---

### 🛡️ Security Controls

| Control | Implementation |
|---------|---------------|
| 🔑 **Authentication** | Custom JWT (HS256), 7-day expiry — no third-party auth provider |
| 🔒 **Password Hashing** | bcrypt with cost factor 12 (~250ms hash time) |
| 🚦 **Rate Limiting** | Postgres-backed atomic SQL upsert — stateless, no Redis needed |
| 👮 **RBAC** | `action:resource` permission model, checked on every protected route |
| 📋 **Audit Trail** | Every write operation logs actor, IP, user-agent, before/after state |
| ✅ **Input Validation** | Zod on every request body, query string, and env variable |
| 🌐 **CORS** | Allowlist only — wildcards blocked in production at startup |
| 🪖 **Security Headers** | HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy via Helmet |
| 🔍 **Secret Scanning** | Gitleaks on every push + local pre-commit hook |
| 🦠 **CVE Scanning** | Trivy filesystem scan on every PR → GitHub Security tab |
| 🔬 **SAST** | CodeQL security-extended queries on every PR |
| 📦 **Dependency Updates** | Dependabot weekly for npm + GitHub Actions |
| ⚙️ **Env Hardening** | Zod schema validates all env vars at startup — invalid config exits immediately |

Full technical reference: [`docs/SECURITY_CONTROLS.md`](docs/SECURITY_CONTROLS.md)

---

## 🏗️ Architecture

### Serverless Deploy Flow

```
🌍 Browser
    │
    ├── GET  /*          ──▶  Vercel CDN  (React SPA, cached at edge)
    │
    └── ANY  /api/v1/*   ──▶  Vercel Serverless Function
                                    │
                              🚀 Fastify (inject adapter)
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
               🛡️ Plugins                   🗄️ Supabase Postgres
               ├── JWT auth                  (Prisma ORM, PgBouncer)
               ├── CORS allowlist
               ├── Helmet headers
               ├── Rate limiting
               └── Zod validation
                      │
               📦 Domain Modules
               ├── auth       ├── inventory
               ├── warehouses ├── stock-movements
               ├── products   ├── grn
               ├── users      ├── cycle-count
               ├── audit      └── reports
```

### Why Postgres rate limiting instead of Redis?

On Vercel's free tier, there's no persistent in-memory store. Instead of adding a paid Redis instance, the rate limiter uses an **atomic SQL upsert**:

```sql
INSERT INTO rate_limits (key, count, reset_at)
VALUES ($1, 1, NOW() + INTERVAL '1 minute')
ON CONFLICT (key) DO UPDATE
  SET count = CASE
    WHEN rate_limits.reset_at < NOW() THEN 1
    ELSE rate_limits.count + 1
  END,
  reset_at = CASE
    WHEN rate_limits.reset_at < NOW() THEN NOW() + INTERVAL '1 minute'
    ELSE rate_limits.reset_at
  END
RETURNING count, reset_at;
```

Single query, no race conditions, no extra infrastructure. See [`src/plugins/rate-limit.ts`](apps/api/src/plugins/rate-limit.ts).

### Monorepo Structure

```
NexStock/
├── 📁 apps/
│   ├── 🚀 api/                     # Fastify backend
│   │   ├── api/index.ts            # Vercel serverless entry point
│   │   ├── prisma/                 # Schema, migrations, seed
│   │   └── src/
│   │       ├── config/             # Env validation, DB singleton
│   │       ├── plugins/            # CORS, JWT, Helmet, rate-limit
│   │       ├── shared/             # Errors, middleware, utils
│   │       └── modules/            # Domain modules (auth, products…)
│   └── 🌐 web/                     # React + Vite frontend
│       ├── vercel.json             # SPA rewrite + security headers
│       └── src/
│           ├── components/         # UI components + layout
│           ├── hooks/              # TanStack Query hooks
│           ├── pages/              # Route-level pages
│           ├── store/              # Zustand auth store
│           └── router/             # React Router config
├── 📁 packages/
│   ├── tsconfig/                   # Shared TypeScript configs
│   └── eslint-config/              # Shared ESLint config
├── 📁 docs/
│   ├── THREAT_MODEL.md             # STRIDE analysis
│   └── SECURITY_CONTROLS.md       # Deep technical reference
├── 📁 .github/
│   ├── workflows/                  # CI, CodeQL, Gitleaks, Trivy
│   └── dependabot.yml
└── turbo.json
```

---

## 🗺️ Roadmap

| Version | Status | Scope |
|---------|--------|-------|
| **v0.1.0** | ✅ Live | Core WMS — auth, RBAC, warehouses, products, inventory, GRN, pick-pack, cycle count |
| **v0.2.0** | 🔜 Next | Security hardening — JWT revocation, account lockout, audit log UI, session management |
| **v0.3.0** | 📋 Planned | Observability — anomaly detection, security event dashboard, audit export |
| **v0.4.0** | 📋 Planned | Advanced WMS — multi-warehouse transfers, supplier management, low stock alerts |

---

## 💻 Local Development

```bash
# Clone & install
git clone https://github.com/Laugerr/NexStock.git
cd NexStock
npm install

# Setup env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/api/.env with your DATABASE_URL and JWT_SECRET

# Start local Postgres
docker compose up -d

# Migrate & seed
cd apps/api && npx prisma migrate dev --name init && npm run db:seed && cd ../..

# Start everything
npm run dev
```

| Service | URL |
|---------|-----|
| 🌐 Web | http://localhost:5173 |
| 🚀 API | http://localhost:3001 |
| ❤️ Health | http://localhost:3001/api/v1/health |

### Useful Commands

```bash
npm run dev          # Start all apps
npm run build        # Build all apps
npm run typecheck    # Type-check all apps
npm run lint         # Lint all apps

# Database (from apps/api)
npm run db:migrate   # Run pending migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset DB + re-migrate
```

---

## 📡 API Reference

Base URL: `/api/v1` · All protected routes require `Authorization: Bearer <token>`

<details>
<summary>🔑 Auth</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Sign in, returns JWT |
| GET | `/auth/me` | JWT | Current user + permissions |
| POST | `/auth/register` | Admin | Create user |

</details>

<details>
<summary>🏭 Warehouses</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/warehouses` | JWT | List warehouses |
| POST | `/warehouses` | Admin/Manager | Create warehouse |
| GET | `/warehouses/:id` | JWT | Warehouse with zones |
| PATCH | `/warehouses/:id` | Admin/Manager | Update warehouse |
| GET | `/warehouses/:id/zones` | JWT | List zones |
| POST | `/warehouses/:id/zones` | Admin/Manager | Create zone |
| GET | `/warehouses/zones/:zoneId/locations` | JWT | List locations |
| POST | `/warehouses/zones/:zoneId/locations` | Admin/Manager | Create location |

</details>

<details>
<summary>📦 Products</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | JWT | List products |
| POST | `/products` | Admin/Manager | Create product |
| GET | `/products/:id` | JWT | Product with inventory |
| PATCH | `/products/:id` | Admin/Manager | Update product |
| GET | `/products/categories` | JWT | All categories |

</details>

<details>
<summary>📊 Inventory & Movements</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/inventory` | JWT | Current stock levels |
| GET | `/inventory/summary` | JWT | Dashboard stats |
| GET | `/stock-movements` | JWT | List movements |
| POST | `/stock-movements` | JWT | Record movement |
| GET | `/stock-movements/:id` | JWT | Movement detail |

</details>

<details>
<summary>👥 Users & Audit</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users |
| PATCH | `/users/:id` | Admin | Update user |
| GET | `/audit` | Admin | Audit log |
| GET | `/api/v1/health` | — | Version, uptime, DB status |

</details>

---

## ⚠️ Free-Tier Considerations

| Limitation | Detail |
|-----------|--------|
| 🥶 Cold starts | ~500–1500ms after inactivity. Frontend retries automatically with exponential backoff. |
| 😴 Supabase pause | Free projects pause after 7 days of inactivity. Resume from the Supabase dashboard. |
| ⏱️ Function timeout | Max 10s per request on Vercel hobby plan. |
| 🔌 Connections | ~60 concurrent on Supabase free tier. Mitigated by `connection_limit=1` in the pooler URL. |

---

## 📄 License

MIT © [Laugerr](https://github.com/Laugerr)
