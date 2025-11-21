# DPIA-lite – Look Optica E-shop & Admin

_Last updated: 2025-11-21_

## 1. Overview

This document summarizes what personal data is collected by the Look Optica
e-shop and admin backend, where it is stored, and for what purposes.

## 2. Systems

- **Frontend**: React (Vite)
- **Backend**: FastAPI (Python)
- **Database**: Postgres (via SQLAlchemy + Alembic)
- **Email sending**: SMTP provider (configured via environment variables)
- **Security tools**:
  - TOTP 2FA for admins
  - HTTP-only sessions for admins
  - CSRF protection for admin APIs
  - Rate limiting on auth endpoints
  - (Future) Cloudflare Turnstile on public forms (orders, registration)

## 3. Data categories

### 3.1 Admin users

- **Fields**: email, full_name, password hash, roles, is_active, 2FA secret flag.
- **Stored in**: `users`, `roles`, `user_roles` tables.
- **Purpose**: secure access to admin interface.
- **Legal basis**: legitimate interest (operating the store securely).

### 3.2 Admin sessions and audit logs

- **Fields**:
  - Sessions: user_id, created_at, expires_at, IP, user_agent.
  - Audit logs: admin_id, action, resource_type, resource_id, metadata, IP, user_agent.
- **Stored in**: `admin_sessions`, `admin_audit_logs`.
- **Purpose**: security, traceability of changes, incident investigation.
- **Retention**: to be defined (e.g. 6–12 months) and applied as a cleanup job.

### 3.3 Contact form submissions

- **Fields**: name, email, subject, message, IP (indirect via logs).
- **Stored**:
  - Inbound email (via SMTP).
  - Short-term logs (for success/failure).
- **Purpose**: customer communication.
- **Legal basis**: user consent and legitimate interest (responding to inquiries).
- **Retention**: as long as needed for communication; can be manually deleted on request.

### 3.4 Future customers (orders, accounts) – planned

- **Fields**: account data (email, name, password hash), order data, addresses, prescriptions.
- **Stored in**: dedicated customer, order, prescription tables (to be designed).
- **Purpose**: e-commerce operations, accounting obligations, after-sales support.
- **Legal basis**: contract performance, legal obligations, legitimate interest.

## 4. Data flows

- Frontend sends admin login data and receives session cookies.
- Admin actions are recorded to `admin_audit_logs`.
- Contact form data is sent via HTTPS to backend, then to SMTP server.
- (Future) Order flows: customer -> frontend -> backend -> DB and third-party payment provider.

## 5. Security measures

- HTTPS (required in production).
- HTTP-only, same-site session cookies for admins.
- CSRF protection for admin APIs.
- Rate limiting on admin auth endpoints.
- TOTP 2FA for admin accounts.
- Regular security patches for OS, Python, dependencies.
- Structured logging of failed logins and errors.

## 6. Data subject rights (GDPR-like)

- **Right of access**: admin can export user data via `/api/admin/users/{id}/export`.  
  (Future: self-service endpoint `/api/me/export`.)
- **Right to erasure**: admin can delete or anonymize users via `/api/admin/users/{id}`.  
  (Subject to legal retention requirements for invoices, accounting, etc.)
- **Right to rectification**: users can request updates via support or account interface (future).

## 7. Processors / third parties

- Hosting provider (server / DB).
- SMTP provider (email).
- (Future) Payment provider (e.g. Viva Wallet).
- (Future) Cloudflare Turnstile / Cloudflare proxy.

For each processor, a data processing agreement (DPA) should be in place.

## 8. Open points / TODO

- Define specific retention periods (e.g. delete old audit logs after X months).
- Implement cron/worker job to delete old sessions and logs.
- Finalize privacy policy text for the website based on this document.
