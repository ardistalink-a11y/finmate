# Finmate

Personal finance SaaS — multi-wallet, multi-currency, bilingual (ID/EN), light & dark mode.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres + Auth + Storage + RLS)
- Tailwind CSS + Radix primitives
- next-intl (i18n) + next-themes (dark mode)
- Recharts (charts), TanStack Query, React Hook Form + Zod

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project at https://supabase.com, then apply migrations:

```
# Copy .env.example → .env.local and fill values
cp .env.example .env.local

# In Supabase SQL editor, run:
#   supabase/migrations/0001_init.sql
#   supabase/migrations/0002_seed.sql
```

Or use Supabase CLI:

```
supabase link --project-ref <your-ref>
supabase db push
```

### 3. Google OAuth (optional)

Supabase Dashboard → Authentication → Providers → Google.
Set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` to show the button.

### 4. Run

```
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/id/login`.

## Project structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/       login, register, forgot-password
│   │   ├── (app)/        dashboard, transactions, accounts, budgets,
│   │   │                 recurring, goals, debts, reports, import,
│   │   │                 advisor, settings
│   │   └── auth/callback/  OAuth code exchange
│   └── api/cron/         fx-rates, recurring, reminders
├── components/           app-shell, sidebar, theme & locale switchers, ui/
├── i18n/                 routing, request config
├── lib/
│   ├── supabase/         client, server, middleware helpers
│   ├── currency/         format, convert, FX fetch
│   ├── finance/          amortization, forecast, aggregates (pure, tested)
│   ├── import/           parse, normalize, dedupe, categorize
│   ├── ai/               provider interface, mock, tools
│   ├── notifications/    channel abstraction (email + WA stub)
│   └── validations/      Zod schemas
└── server/actions/       auth, accounts, transactions
messages/
├── id.json
└── en.json
supabase/migrations/
├── 0001_init.sql         all tables + RLS + triggers
└── 0002_seed.sql         currencies, system categories
tests/
├── finance.test.ts
└── import.test.ts
```

## Roadmap status

- **P0 — Foundation** ✅ complete: auth, i18n, dark mode, layout, design system
- **P1 — Wallets & Transactions** ✅ complete: CRUD, multi-currency snapshots
- **P2–P7** — scaffolding only (pages render, logic in `lib/` ready)

See `docs/blueprint.md` for the full plan.

## Multi-currency model

Every transaction stores:

- `amount` in the **account's currency**
- `fx_rate` snapshot at transaction time
- `amount_base` = `amount × fx_rate` in the **profile's base currency**

Reports and budgets always aggregate `amount_base` → numbers never change retroactively.

## License

MIT

</BDS:create_file>

<BDS:create_file fileName="finmate/src/i18n/routing.ts">

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

