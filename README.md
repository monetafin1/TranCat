# Transaction Categorizer

Multi-client transaction review app backed by Supabase. Pick a client, filter transactions on any column, and edit category/status inline.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign up with an email/password to create your account, then you'll land on `/dashboard`.

## Environment

`.env.local` already contains the Supabase project URL and anon key for the `Moneta` project. Don't commit this file with different/production secrets without checking first.

## Data model

- `tenants` — your clients
- `categories` — P&L categories (seeded from Zoho Books PnL Categories.xlsx)
- `transactions` — extended with `category_id`, `status` (`pending_review` / `categorized`), `source_file`, `bank`, `currency`
- `profiles`, `tenant_members` — created for future per-team access control

**Note:** Row Level Security is currently OFF on all tables (by your choice). Any authenticated user can read/write all clients' data. Revisit this before this app handles anything sensitive beyond your own team.

## Deploy

Not yet deployed. To deploy on Vercel:
1. Push this folder to a GitHub repo
2. Import the repo at vercel.com/new
3. Add the two env vars from `.env.local` in the Vercel project settings
4. Deploy

## Build verification

`npm run build` and `npx tsc --noEmit` both pass as of the last update.
