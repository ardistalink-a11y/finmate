# Finmate

Finmate is a bilingual personal-finance web app with multiple accounts and currencies.

## Stack

- Next.js 15 App Router and TypeScript
- Supabase Auth and Postgres with row-level security
- Tailwind CSS, Radix UI, and next-intl
- Recharts for charts

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and fill in your Supabase project values:

   ```bash
   cp .env.example .env.local
   ```

   Keep `SUPABASE_SERVICE_ROLE_KEY` on the server. Never expose it through a `NEXT_PUBLIC_*` variable or client code.

3. Apply the database migrations to a linked Supabase project:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push --remote
   ```

   The core schema is in `supabase/migrations/20261104065059_create_finmate_core_schema.sql`; the next migration tightens RLS policies, function permissions, and foreign-key indexes.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. The app uses `/id` by default and also supports `/en`.

## Supabase configuration

Google sign-in is optional. Configure the Google provider in Supabase Dashboard → Authentication → Providers, then set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`.

The example environment file also documents optional AI, email, WhatsApp, and cron settings. Configure only the providers used by your deployment.

## Money and currencies

Transactions store `amount` in the account currency and `fx_rate` as the conversion snapshot. `amount_base` stores the converted value in the user's base currency so historical reports do not change when rates move.

## Project scripts

- `npm run dev`: development server
- `npm run build`: production build
- `npm run start`: serve a production build
- `npm run lint`: lint

## License

MIT
