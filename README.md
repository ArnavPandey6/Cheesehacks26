# Relay Commons (Supabase Wired)

This app is now wired to Supabase for:

- Authentication (`sign up`, `sign in`, `sign out`)
- Persistent profiles and karma
- Vault inventory + reserve/return transactions
- Hallway posts + claim/return transactions
- DB-issued hallway return QR tokens (owner-generated, borrower-verified)
- Supabase Storage-backed image uploads (cross-user visible)
- Realtime sync for profiles, hallway feed, and vault inventory

## 1) Configure Supabase

1. Create a Supabase project.
2. Apply database schema (pick one):
   - SQL Editor: run `supabase/schema.sql`
   - Terminal (linked project): run migrations with `supabase db push`
3. In project settings, copy:
   - `Project URL`
   - `anon public key`
4. For MVP signup/login without email verification friction:
   - In Supabase dashboard -> `Authentication` -> `Providers` -> `Email`
   - Turn off `Confirm email` (so random test emails work immediately)
   - Optional via CLI config push (after login/link): set `auth.email.enable_confirmations = false` in `supabase/config.toml`, then run `supabase config push`

### Terminal schema apply (PowerShell)

```powershell
cd D:\cheesehacks

Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*$' -or $_ -match '^\s*#') { return }
  $k, $v = $_.Split('=', 2)
  Set-Item -Path "Env:$k" -Value $v
}

npx.cmd supabase login
npx.cmd supabase link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD
npx.cmd supabase db push --include-all
npx.cmd supabase config push
```

## 2) Set environment variables

Create `.env` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Expo reads `EXPO_PUBLIC_*` variables at runtime.

## 3) Install + run

```bash
npm install
npm.cmd run start -- --tunnel --clear --port 8082
```

## 4) Notes

- If Supabase env vars are missing, the auth screen shows a config error.
- All core state now comes from Supabase tables, not in-memory seed data.
- Hallway owner-return QR flow is enforced in Supabase with short-lived DB tokens.
- If you already ran older migrations, run `supabase db push --include-all` once.
