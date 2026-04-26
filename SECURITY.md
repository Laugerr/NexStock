# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ Active |

This is a portfolio project. The `main` branch is the only supported version.

---

## Reporting a Vulnerability

If you discover a security vulnerability in NexStock, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to report

1. Email: **[your-email@example.com]** *(replace with your real email)*
2. Subject line: `[NexStock] Security Vulnerability Report`
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested mitigations

### What to expect

| Step | Timeframe |
|------|-----------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix or mitigation | Within 30 days for critical, 90 days for others |
| Public disclosure | After fix is deployed, coordinated with reporter |

---

## Scope

### In scope

- Authentication and authorisation bypass
- JWT secret exposure or forgery
- SQL injection via Prisma queries
- Privilege escalation via RBAC bypass
- Secrets or credentials exposed in responses, logs, or error messages
- Rate limiting bypass on auth endpoints
- CORS misconfiguration allowing credential theft

### Out of scope

- Denial of service against the free-tier Vercel/Supabase infrastructure
- Issues requiring physical access to infrastructure
- Vulnerabilities in third-party dependencies (report these to the upstream project; Dependabot handles automated updates)
- Issues in demo data (the demo credentials are intentionally public)

---

## Security Controls Summary

See [`docs/SECURITY_CONTROLS.md`](docs/SECURITY_CONTROLS.md) for a detailed breakdown of every security control implemented in this project.
