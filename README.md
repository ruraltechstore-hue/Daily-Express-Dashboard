# Daily Express — Admin Dashboard

Admin dashboard for the Daily Express dairy home delivery platform. Built with React 19, Vite, TypeScript, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js 20+
- A Supabase project with the schema applied

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Only the **anon/publishable** key belongs in the frontend. Never put the service role key in `.env`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Database setup

Apply migrations in order via the Supabase SQL editor or CLI:

1. `supabase/migrations/full-schema.sql`
2. `supabase/migrations/20260703074421_add_storage_and_product_fields.sql`
3. `supabase/migrations/20260709120000_production_readiness.sql`

### Bootstrap an admin user

After creating your first auth user in Supabase Auth, promote them to admin:

```sql
INSERT INTO public.profiles(id, role, full_name)
VALUES ('<YOUR-AUTH-USER-UUID>', 'admin', 'Super Admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## Production build

```bash
npm run build
npm run preview
```

## Deployment

### Vercel (recommended)

1. Import the repository in Vercel
2. Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Deploy — `vercel.json` handles SPA routing

### Netlify

`public/_redirects` is included for SPA fallback.

## Supabase Edge Functions

The dashboard expects these Edge Functions to be deployed on your Supabase project:

- `create-delivery-boy` — creates delivery agent auth accounts

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Security notes

- Row Level Security (RLS) is enabled on all core tables
- Storage uploads are restricted to admin users
- Only users with `role = 'admin'` in `profiles` can access the dashboard
- Enable [leaked password protection](https://supabase.com/docs/guides/auth/password-security) in Supabase Auth settings
