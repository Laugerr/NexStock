# NexStock — Warehouse Management System

> A modern, production-grade Warehouse Management System built with Node.js, TypeScript, PostgreSQL, React, and Docker. Designed as a scalable monolith-first architecture with a clear path to microservices.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + TanStack Query |
| Monorepo | TurboRepo + npm workspaces |
| Auth | JWT + bcrypt + RBAC |
| Validation | Zod |
| Containers | Docker Compose |

---

## Architecture

- **Monolith-first modular structure** → Clean domain separation, easy to extract into microservices
- **Domain-based modules** → Each domain has its own schema, service, and route layer
- **Multi-tenant ready** → Schema prepared for tenant isolation without full implementation overhead
- **Event-driven foundations** → Audit log captures all state changes, ready for event sourcing
- **RBAC** → Role-based access control with granular action:resource permissions
- **API versioning** → All routes under `/api/v1` from day one

---

## Monorepo Structure

```
nexstock/
├── apps/
│   ├── api/                        # Fastify backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── seed.ts             # Seed data
│   │   └── src/
│   │       ├── config/             # Env, DB, Redis
│   │       ├── plugins/            # Fastify plugins (JWT, CORS, errors)
│   │       ├── shared/             # Errors, middleware, utils, types
│   │       └── modules/
│   │           ├── auth/           # Login, register, RBAC
│   │           ├── users/          # User management
│   │           ├── warehouses/     # Warehouses, zones, locations
│   │           ├── products/       # Product catalog + SKU
│   │           ├── inventory/      # Stock levels
│   │           ├── stock-movements/# GRN, picks, transfers, adjustments
│   │           ├── audit/          # Audit log
│   │           └── health/         # Health check endpoint
│   └── web/                        # React + Vite frontend
│       └── src/
│           ├── components/         # UI components + layout
│           ├── hooks/              # TanStack Query hooks
│           ├── layouts/            # AppLayout, AuthLayout
│           ├── lib/                # API client, query client, utils
│           ├── pages/              # Route-level pages
│           ├── router/             # React Router config
│           ├── store/              # Zustand auth store
│           └── types/              # Shared API types
├── packages/
│   ├── tsconfig/                   # Shared TypeScript configs
│   └── eslint-config/              # Shared ESLint config
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker Desktop (for PostgreSQL + Redis)

### 1. Clone and install

```bash
git clone https://github.com/Laugerr/NexStock.git
cd NexStock
npm install
```

### 2. Set up environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` — set a strong `JWT_SECRET` (min 32 chars).

### 3. Start infrastructure

```bash
docker compose up -d
```

### 4. Run database migrations and seed

```bash
cd apps/api
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Start development servers

From the repo root:
```bash
npm run dev
```

Or individually:
```bash
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Web
cd apps/web && npm run dev
```

**API:** http://localhost:3001  
**Web:** http://localhost:5173  
**Health:** http://localhost:3001/health  

### Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@nexstock.com | Admin@123! | Admin (full access) |
| manager@nexstock.com | Manager@123! | Warehouse Manager |
| picker@nexstock.com | Picker@123! | Picker |

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Sign in, returns JWT |
| GET | `/auth/me` | Current user info |
| POST | `/auth/register` | Create user (admin only) |

### Warehouses
| Method | Path | Description |
|--------|------|-------------|
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |
| GET | `/warehouses/:id` | Get warehouse with zones |
| PATCH | `/warehouses/:id` | Update warehouse |
| GET | `/warehouses/:id/zones` | List zones |
| POST | `/warehouses/:id/zones` | Create zone |
| GET | `/warehouses/zones/:zoneId/locations` | List locations |
| POST | `/warehouses/zones/:zoneId/locations` | Create location |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List products (with search) |
| POST | `/products` | Create product |
| GET | `/products/:id` | Product with inventory |
| PATCH | `/products/:id` | Update product |
| GET | `/products/categories` | All categories |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | Current stock levels |
| GET | `/inventory/summary` | Dashboard stats |

### Stock Movements
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stock-movements` | List movements |
| POST | `/stock-movements` | Record movement |
| GET | `/stock-movements/:id` | Movement detail |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | User detail |
| PATCH | `/users/:id` | Update user |
| GET | `/users/roles` | Available roles |

### Audit
| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit` | Audit log (admin only) |

---

## Database Schema

Core models with relationships:

```
User ──── Role ──── Permission
Warehouse ──── Zone ──── Location
Product ──── InventoryItem ──── Location
Product ──── StockMovement ──── Location (from/to)
User ──── StockMovement
User ──── AuditLog
```

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

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 1 — Core Foundation** | 🚧 In Progress | Auth, RBAC, warehouses, products, inventory, stock movements, audit |
| Phase 2 — Business Operations | Planned | POs, sales orders, wave picking, supplier portal, notifications |
| Phase 3 — Advanced Operations | Planned | Multi-warehouse, cross-docking, ERP integrations, SLA tracking |
| Phase 4 — Pro / Platform | Planned | Robotics, AI optimization, IoT, blockchain traceability |

---

## License

MIT
