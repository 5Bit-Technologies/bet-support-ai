# Helix Support

> **AI-powered ticket operations for regulated gaming.**
> Role-aware support workspace for customers, staff, and admins — with automatic ticket classification, no dropdowns required.

[![Built with TanStack Start](https://img.shields.io/badge/TanStack-Start-blue)](https://tanstack.com/start)
[![Backend: Lovable Cloud](https://img.shields.io/badge/Backend-Lovable%20Cloud-7C3AED)](https://lovable.dev)
[![Type: TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)

---

## What is it?

Helix Support is a ticket management platform built for online gaming operators. It serves **three distinct user types**, each in their own themed workspace:

| Role | Workspace | Theme | What they can do |
|------|-----------|-------|------------------|
| **Customer** | `/portal` | Sky blue | Log tickets in plain language, track status, reply, attach files |
| **Staff** | `/staff` | Emerald / teal | Log **internal** tickets (HR, IT, Finance, Facilities, Security); cannot see customer tickets |
| **Admin** | `/admin` | Violet / fuchsia | See **every** ticket, manage users, analytics, delete |

Tickets are submitted in free-form text — an **AI classifier** assigns category, priority, and routing automatically. Users never pick a category.

---

## Key features

- 🎨 **Three visually-distinct dashboards** — instantly obvious which role you're in.
- 🤖 **Automatic ticket classification** via Lovable AI Gateway (Gemini Flash). Category, priority, sentiment, and suggested department are predicted on submit.
- 🔒 **One email = one role.** Role mismatch at sign-in is denied. Staff/Admin signups gated by access codes.
- 🛡️ **Row-Level Security** on every table. `has_role()` security-definer prevents privilege escalation.
- 📦 **Scoped queues** — customer tickets are invisible to staff; internal tickets are invisible to customers.
- 💬 **Realtime updates**, internal notes, attachments, and AI confidence signals on every ticket.

---

## Ticket categories

**Customer-facing:** withdrawals · deposits · betting issues · account verification (KYC) · login problems · promotions & bonuses

**Internal / staff:** HR · IT · Finance · Facilities · internal security

---

## Tech stack

- **Frontend** — TanStack Start v1 (React 19, Vite 7, file-based routing)
- **Styling** — Tailwind CSS v4 + shadcn/ui with per-workspace theme variants
- **Backend** — Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions)
- **AI** — Lovable AI Gateway (Google Gemini Flash)
- **Realtime** — Supabase Realtime channels
- **Runtime** — Cloudflare Workers (edge)

---

## Getting started

```bash
# install
bun install

# run dev server
bun dev
```

Lovable Cloud environment variables are injected automatically — no `.env` setup needed for the managed backend.

### Database migrations

Schema changes live under `supabase/migrations/`. Auto-generated types are written to `src/integrations/supabase/types.ts` — **do not hand-edit**.

### Sign-up access codes

Staff and Admin signups require an access code validated by the `claim_signup_role` database function. Customers self-serve.

---

## Project structure

```
src/
├── routes/
│   ├── index.tsx          # public landing
│   ├── auth.tsx           # sign in / sign up (role dropdown)
│   ├── portal/            # customer workspace
│   ├── staff/             # staff workspace (internal only)
│   └── admin/             # admin console
├── components/
│   ├── AppShell.tsx       # themed sidebar + banner per workspace
│   └── TicketsTable.tsx   # audience-aware ticket list
├── hooks/useAuth.tsx      # auth + roles context
├── lib/ticket-utils.ts    # category / status / priority enums
└── integrations/supabase/ # auto-generated client & types

supabase/
├── migrations/            # SQL schema migrations
└── functions/
    └── classify-ticket/   # AI classification edge function
```

---

## Authentication flow

1. User picks **Customer / Staff / Admin** from the dropdown on the sign-in form.
2. Supabase Auth signs them in.
3. App reads `user_roles` for the account.
4. Selected role must match the stored role — otherwise the user is signed back out and shown an access-denied toast.
5. On success the user is routed to the workspace matching their effective role (`admin` → `/admin`, `staff` → `/staff`, `customer` → `/portal`). Routing waits for the `rolesLoaded` flag to avoid race-condition redirects.

---

## Roadmap

- ⏱️ SLA timers per category with breach alerts
- 📝 Customer satisfaction surveys on resolution
- 🗂️ Saved triage views & bulk-assign for staff
- 📚 Knowledge base with AI-suggested replies
- 🔔 Slack / Teams notifications for urgent tickets

---

## License

Proprietary — © 2026 Helix Support.
