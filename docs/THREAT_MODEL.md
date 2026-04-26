# Threat Model — NexStock

**Methodology:** STRIDE  
**Scope:** Authentication flow + Stock Movement flow  
**Last updated:** 2026-04

---

## System Overview

```
[Browser]
    │  HTTPS
    ▼
[Vercel CDN]  ──static──►  React SPA
    │  /api/v1/*
    ▼
[Vercel Serverless Function]
    │  Fastify inject adapter
    ▼
[Route Handler]
    │  JWT verify → RBAC check → Zod validate → Service
    ▼
[Supabase Postgres]  (PgBouncer pooler)
```

**Trust boundaries:**
- Browser ↔ Vercel CDN: public internet, HTTPS only
- Vercel Function ↔ Supabase: private network within Vercel/Supabase infrastructure

---

## Flow 1 — Authentication

### Sequence

```
1. User POSTs /api/v1/auth/login { email, password }
2. Zod validates request body
3. Rate limiter checks IP:route counter (Postgres)
4. auth.service: look up user by email (case-insensitive)
5. bcrypt.compare(password, passwordHash)
6. fastify.jwt.sign({ sub, email, roleId, roleName })
7. AuditLog: action=LOGIN, resource=auth, ipAddress, userAgent
8. Return { token, user }
```

### STRIDE Analysis

| ID | Category | Threat | Mitigation | Code |
|----|----------|--------|-----------|------|
| A1 | **Spoofing** | Attacker forges a JWT to impersonate another user | HS256 signature verified on every request; `JWT_SECRET` ≥ 32 chars, stored as Vercel secret | [`plugins/jwt.ts`](../apps/api/src/plugins/jwt.ts) |
| A2 | **Spoofing** | Brute-force login to guess a valid user's password | bcrypt cost 12 slows each attempt; rate limit 10/min per IP | [`plugins/rate-limit.ts`](../apps/api/src/plugins/rate-limit.ts) |
| A3 | **Spoofing** | Email enumeration — attacker learns which emails are registered | Login returns identical error for unknown email, inactive account, and wrong password | [`modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) |
| A4 | **Tampering** | Attacker modifies JWT payload to elevate role | HS256 signature detects any payload modification; invalid signature → 401 | [`plugins/jwt.ts`](../apps/api/src/plugins/jwt.ts) |
| A5 | **Tampering** | Request body injection (e.g. extra fields, type coercion) | Zod `parse()` strips unknown fields and enforces types before any service logic | [`modules/auth/auth.schema.ts`](../apps/api/src/modules/auth/auth.schema.ts) |
| A6 | **Repudiation** | User denies performing a login | AuditLog records userId, ipAddress, userAgent, timestamp on every LOGIN | [`modules/audit/audit.service.ts`](../apps/api/src/modules/audit/audit.service.ts) |
| A7 | **Information Disclosure** | JWT payload exposes sensitive data | Payload contains only `sub`, `email`, `roleId`, `roleName` — no passwordHash, no PII beyond email | [`modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) |
| A8 | **Information Disclosure** | Error messages reveal internal structure | Production errors return generic messages; stack traces are suppressed when `NODE_ENV=production` | [`plugins/error-handler.ts`](../apps/api/src/plugins/error-handler.ts) |
| A9 | **Information Disclosure** | Token intercepted in transit | HSTS forces HTTPS; `Strict-Transport-Security: max-age=31536000; preload` on all responses | [`server.ts`](../apps/api/src/server.ts) |
| A10 | **Denial of Service** | Flood of login requests exhausts Supabase connections | Rate limiter returns 429 before DB query; `connection_limit=1` in pooler URL caps concurrent connections | [`plugins/rate-limit.ts`](../apps/api/src/plugins/rate-limit.ts) |
| A11 | **Elevation of Privilege** | Picker-role user calls admin-only `/auth/register` | `authorize('create', 'user')` preHandler rejects any role lacking the permission | [`modules/auth/auth.route.ts`](../apps/api/src/modules/auth/auth.route.ts) |

---

## Flow 2 — Stock Movement

### Sequence

```
1. User POSTs /api/v1/stock-movements { type, productId, toLocationId, quantity }
2. JWT verify → extract userId
3. authorize('create', 'stock-movement') → DB permission check
4. Zod validates body
5. stock-movements.service: validate product + location exist, create StockMovement
6. Update InventoryItem quantity (upsert)
7. AuditLog: action=CREATE, resource=stock-movement, before/after, ipAddress
8. Return created movement
```

### STRIDE Analysis

| ID | Category | Threat | Mitigation | Code |
|----|----------|--------|-----------|------|
| S1 | **Spoofing** | Unauthenticated user records a stock movement | `fastify.authenticate` preHandler rejects requests without a valid JWT | [`modules/stock-movements/stock-movements.route.ts`](../apps/api/src/modules/stock-movements/stock-movements.route.ts) |
| S2 | **Spoofing** | User records movement as a different user (forged `performedById`) | `performedById` is always set from `request.user.sub` (JWT claim), never from the request body | [`modules/stock-movements/stock-movements.service.ts`](../apps/api/src/modules/stock-movements/stock-movements.service.ts) |
| S3 | **Tampering** | Attacker manipulates quantity to a negative value or overflow | Zod schema enforces `quantity: z.number().int().positive()` | [`modules/stock-movements/stock-movements.schema.ts`](../apps/api/src/modules/stock-movements/stock-movements.schema.ts) |
| S4 | **Tampering** | Attacker references a product or location that does not exist | Prisma foreign key constraints + service-layer existence checks return 404 before any write | [`modules/stock-movements/stock-movements.service.ts`](../apps/api/src/modules/stock-movements/stock-movements.service.ts) |
| S5 | **Repudiation** | Warehouse manager denies approving a large adjustment | AuditLog captures `before`/`after` inventory state, actor, IP, timestamp for every movement | [`modules/audit/audit.service.ts`](../apps/api/src/modules/audit/audit.service.ts) |
| S6 | **Information Disclosure** | Picker reads movements they did not perform | `authorize('read', 'stock-movement')` — pickers hold this permission (read-only is intentional for operational visibility) | [`shared/middleware/authorize.ts`](../apps/api/src/shared/middleware/authorize.ts) |
| S7 | **Information Disclosure** | Error response leaks DB row details (e.g. Prisma error messages) | Global error handler catches Prisma errors; production returns generic `INTERNAL_SERVER_ERROR` | [`plugins/error-handler.ts`](../apps/api/src/plugins/error-handler.ts) |
| S8 | **Denial of Service** | Flood of movement creation exhausts DB write capacity | Global rate limit 120 req/min per IP; Supabase PgBouncer pools connections | [`plugins/rate-limit.ts`](../apps/api/src/plugins/rate-limit.ts) |
| S9 | **Elevation of Privilege** | Picker attempts to create a WRITE_OFF (admin/manager only) | `authorize('create', 'stock-movement')` — pickers hold this permission. The `type` field is validated by Zod enum but not further restricted by role. **Known gap: role-based movement type restriction is not yet implemented.** | [`modules/stock-movements/stock-movements.schema.ts`](../apps/api/src/modules/stock-movements/stock-movements.schema.ts) |
| S10 | **Elevation of Privilege** | Picker accesses admin route `/users` | `authorize('read', 'user')` is admin-only; pickers lack this permission and receive 403 | [`modules/users/users.route.ts`](../apps/api/src/modules/users/users.route.ts) |

---

## Known Gaps & Accepted Risks

| ID | Gap | Risk | Accepted reason |
|----|-----|------|----------------|
| G1 | No JWT revocation list | A stolen token is valid until expiry (7 days) | Acceptable for a demo; mitigated by short expiry and RBAC live-check |
| G2 | Picker can create any movement type (S9 above) | A picker could record a WRITE_OFF or ADJUSTMENT | Planned for Phase 2 — requires movement-type RBAC extension |
| G3 | No MFA | Account takeover via credential stuffing if rate limit is bypassed | Acceptable for a demo; demo credentials are public by design |
| G4 | Postgres rate limiting adds per-request DB query | DoS via high request volume can exhaust Supabase free-tier connections | Mitigated by `connection_limit=1` and Vercel function concurrency limits |
| G5 | Single `JWT_SECRET` — no rotation | Rotating the secret invalidates all active sessions | Acceptable for a portfolio project |
