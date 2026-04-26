# Security Controls — Technical Reference

This document describes every security control implemented in NexStock, written for a technical reviewer. For a summary table, see the [README](../README.md#security-controls).

---

## 1. Authentication — JWT + bcrypt

### Password hashing

- **Algorithm:** bcrypt via `bcryptjs`
- **Cost factor:** 12 (≈250 ms per hash on modern hardware — high enough to resist brute force, low enough to not degrade UX)
- **Implementation:** [`apps/api/src/shared/utils/password.ts`](../apps/api/src/shared/utils/password.ts)

```typescript
const SALT_ROUNDS = 12
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}
```

### JWT issuance

- **Algorithm:** HS256 (HMAC-SHA256)
- **Expiry:** 7 days (configurable via `JWT_EXPIRES_IN`)
- **Payload:** `{ sub, email, roleId, roleName }` — no sensitive fields
- **Secret:** minimum 32 characters, validated at startup by Zod
- **Implementation:** [`apps/api/src/plugins/jwt.ts`](../apps/api/src/plugins/jwt.ts)

### Token verification

Every protected route runs `fastify.authenticate` as a `preHandler`. This calls `request.jwtVerify()` which validates the signature, expiry, and structure. Invalid or expired tokens throw `UnauthorizedError` (401).

### Email enumeration prevention

The login endpoint returns the same error message (`Invalid email or password`) whether the email does not exist, the account is inactive, or the password is wrong. This prevents an attacker from determining which emails are registered.

```typescript
// apps/api/src/modules/auth/auth.service.ts
if (!user || !user.isActive) {
  throw new UnauthorizedError('Invalid email or password')
}
const isValid = await comparePasswords(password, user.passwordHash)
if (!isValid) {
  throw new UnauthorizedError('Invalid email or password')
}
```

---

## 2. Authorisation — RBAC

### Model

Permissions follow an `action:resource` model. Valid actions: `create`, `read`, `update`, `delete`. Resources include `warehouse`, `zone`, `location`, `product`, `inventory`, `stock-movement`, `user`, `audit-log`.

Each `Role` has a set of `RolePermission` rows. On every protected request, `authorize(action, resource)` queries the database to confirm the authenticated user's role holds the required permission.

### Enforcement

```typescript
// apps/api/src/shared/middleware/authorize.ts
export function authorize(action: string, resource: string) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const hasPermission = await db.rolePermission.findFirst({
      where: {
        role: { users: { some: { id: request.user.sub } } },
        permission: { action, resource },
      },
    })
    if (!hasPermission) throw new ForbiddenError(...)
  }
}
```

This is a **live database check** on every request — not a cached JWT claim. If a user's role is changed, the new permissions take effect on the next request without requiring token rotation.

### Role hierarchy (seeded)

| Role | Permissions |
|------|------------|
| `admin` | All actions on all resources |
| `warehouse_manager` | All actions except `create/update/delete user` |
| `picker` | `read` on all resources + `create` on `stock-movement` |

---

## 3. Rate Limiting — Postgres-backed

### Why not in-memory

Vercel serverless functions are stateless. In-memory rate limiters (like `@fastify/rate-limit` with no store) reset on every cold start and don't share state across concurrent instances. A Postgres table is the only reliable store on the free tier (no Redis).

### Implementation

A single atomic SQL upsert per request:

```sql
INSERT INTO rate_limits (id, key, count, reset_at, created_at)
VALUES ($id, $key, 1, $resetAt, NOW())
ON CONFLICT (key) DO UPDATE SET
  count = CASE WHEN rate_limits.reset_at < NOW() THEN 1 ELSE rate_limits.count + 1 END,
  reset_at = CASE WHEN rate_limits.reset_at < NOW() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
RETURNING count
```

The `CASE` expression handles window resets atomically — no separate SELECT + UPDATE round trip, no race conditions.

### Limits

| Route | Limit | Window |
|-------|-------|--------|
| `POST /api/v1/auth/login` | 10 requests | 1 minute |
| `POST /api/v1/auth/register` | 5 requests | 1 minute |
| All other routes | 120 requests | 1 minute |

Rate limit headers are included on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

**Implementation:** [`apps/api/src/plugins/rate-limit.ts`](../apps/api/src/plugins/rate-limit.ts)

---

## 4. Audit Logging

Every authenticated state-changing action writes an `AuditLog` record:

| Field | Content |
|-------|---------|
| `userId` | Authenticated user ID |
| `action` | `LOGIN`, `CREATE`, `UPDATE`, `DELETE` |
| `resource` | Domain name (warehouse, product, etc.) |
| `resourceId` | ID of the affected record |
| `before` | JSON snapshot of state before change |
| `after` | JSON snapshot of state after change |
| `ipAddress` | Client IP (read from `x-forwarded-for` via Fastify `trustProxy`) |
| `userAgent` | `User-Agent` header |

**Implementation:** [`apps/api/src/modules/audit/audit.service.ts`](../apps/api/src/modules/audit/audit.service.ts)

---

## 5. Input Validation — Zod

All request bodies and query strings are validated with Zod before reaching service logic. Validation errors return HTTP 422 with field-level error details. No raw `req.body` access in route handlers — always `.parse()` first.

Example schema:
```typescript
// apps/api/src/modules/auth/auth.schema.ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
```

---

## 6. Security Headers

Applied to every API response via `@fastify/helmet`:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

**Implementation:** [`apps/api/src/server.ts`](../apps/api/src/server.ts)

The static frontend (served by Vercel CDN) has its own header policy defined in [`apps/web/vercel.json`](../apps/web/vercel.json) with a CSP allowing `'self'` scripts and styles (required for React + Tailwind).

---

## 7. CORS

Origins are read from the `CORS_ORIGINS` environment variable (comma-separated list). At startup:

- If `NODE_ENV=production` and `CORS_ORIGINS` contains `*` → hard exit
- If `NODE_ENV=production` and `CORS_ORIGINS` contains `localhost` → warning

In production, `CORS_ORIGINS` must be set to the exact frontend URL (e.g. `https://nexstock.vercel.app`).

**Implementation:** [`apps/api/src/plugins/cors.ts`](../apps/api/src/plugins/cors.ts)

---

## 8. Environment Variable Validation

At startup, `env.ts` validates all required variables using Zod:

- `DATABASE_URL` — must be a valid URL starting with `postgresql://` or `postgres://`
- `JWT_SECRET` — minimum 32 characters
- `CORS_ORIGINS` — present and non-empty
- `NODE_ENV` — must be one of `development`, `production`, `test`

If any validation fails, the process exits with a descriptive error listing the failed fields **but not the actual values**.

**Implementation:** [`apps/api/src/config/env.ts`](../apps/api/src/config/env.ts)

---

## 9. Secret Scanning

**Local (pre-commit):** `pre-commit` runs gitleaks before every commit. Stops secrets from ever entering git history.

**CI (GitHub Actions):** gitleaks runs on every push and PR with full history checkout (`fetch-depth: 0`) so commits added to a PR are all scanned, not just the tip.

**Allowlist:** [`/.gitleaks.toml`](../.gitleaks.toml) whitelists the intentionally public demo credentials in `seed.ts`, `.env.example` placeholders, and README credential tables.

---

## 10. Dependency Scanning

**Trivy** (Aqua Security) runs on every PR in filesystem mode, scanning `package-lock.json` and source files for:
- Known CVEs (HIGH and CRITICAL only — avoids noise)
- Misconfigurations

Results are uploaded as SARIF and visible in **GitHub → Security → Code scanning**.

**Dependabot** opens PRs weekly for outdated dependencies across all npm workspaces and GitHub Actions.

**Implementation:** [`.github/workflows/trivy.yml`](../.github/workflows/trivy.yml), [`.github/dependabot.yml`](../.github/dependabot.yml)

---

## 11. Static Analysis — CodeQL

CodeQL runs the `security-extended` query suite on every PR and weekly on `main`. This covers:

- SQL injection (via Prisma parameterised queries — expected no findings)
- XSS (not applicable — API-only, no HTML rendering)
- Path traversal
- Prototype pollution
- Insecure deserialization
- Authentication bypass patterns

**Implementation:** [`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml)

---

## Known Limitations

| Limitation | Detail |
|-----------|--------|
| No JWT rotation | Tokens are stateless; there is no revocation list. Mitigation: short expiry (7d), RBAC is live-checked per request. |
| Postgres rate limiting adds latency | ~5–10 ms per request for the rate limit upsert. Acceptable for a demo. |
| Single JWT secret | No key rotation mechanism. Changing `JWT_SECRET` invalidates all existing sessions. |
| No MFA | Not implemented. Suitable for a demo; would be required for a real deployment. |
