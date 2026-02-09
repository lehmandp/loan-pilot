# LoanPilot — Deployment Guide

## Architecture

```
Browser → Vercel (Next.js frontend) → Supabase (Postgres + Auth + Realtime)
```

- **Supabase** handles: database, user auth, row-level security (RLS), and realtime sync
- **Vercel** handles: hosting the Next.js app with automatic deploys from Git
- **RLS policies** enforce that Processors only see their assigned loans — this is at the *database* level, not just the UI

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / sign in
2. Click **New Project**
3. Pick a name (e.g., `loanpilot`), set a database password, choose a region close to you
4. Wait ~2 minutes for it to provision

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the *entire* contents of `supabase/schema.sql` from this project
4. Click **Run** — this creates all tables, RLS policies, and realtime config

## Step 3: Configure Auth

1. Go to **Authentication** > **Settings** in the Supabase dashboard
2. Under **Email Auth**, make sure "Enable Email Signup" is ON
3. Optional: Turn off "Confirm email" for faster testing (Auth > Settings > toggle off email confirmation)
4. Optional: Add **Google OAuth** or **Magic Link** later for a smoother login experience

## Step 4: Get Your API Keys

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy:
   - **Project URL** → e.g., `https://abcdefgh.supabase.co`
   - **anon public key** → starts with `eyJ...`
3. You'll need these in Step 6

## Step 5: Push Code to GitHub

```bash
# From the loanpilot folder:
cd loanpilot
git init
git add .
git commit -m "Initial LoanPilot setup"

# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/loanpilot.git
git branch -M main
git push -u origin main
```

## Step 6: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** > **Project**
3. Import your `loanpilot` repo
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Vercel will build and give you a live URL (e.g., `loanpilot.vercel.app`)

## Step 7: Create Your First User

1. Visit your deployed URL
2. Click **Sign Up**
3. Create an account with role = **Lender** (this is the admin/loan officer role)
4. Confirm email if required
5. Sign in — you'll see the empty dashboard
6. Click **+ Add Loan** to start adding your pipeline

## Step 8: Invite Your Team

Share the URL with your processors and assistants. They sign up and choose their role:

| Role | Sees | Can Edit |
|------|------|----------|
| **Lender** | All loans | Everything — add, edit, assign processors |
| **Processor** | Only loans assigned to them | Can update their assigned loans |
| **Assistant** | All loans | Read-only |

After a processor signs up, go to any loan → Edit → assign them as the Processor. They'll immediately see that loan in their view.

---

## Seed Data (Optional)

To import your existing spreadsheet loans, run this in the Supabase SQL Editor after creating your user accounts. You'll need to replace the processor UUIDs with the actual UUIDs from your `profiles` table:

```sql
-- Check your profile UUIDs first:
SELECT id, full_name, role FROM profiles;

-- Then insert loans (replace UUIDs):
INSERT INTO loans (borrower, amount, purpose, loan_type, locked, lock_exp, processor_id, sub_date, cr_date, coe_date, status, notes) VALUES
('Danielle Acosta', 633410, 'Purchase', 'Conventional', true, '2025-11-03', 'MARISA_UUID_HERE', '2025-10-02', '2025-10-13', '2025-10-31', 'CTC', ''),
('Geoffrey Bentley', 513401, 'Purchase', 'VA', false, null, 'LARYSSA_UUID_HERE', null, null, null, 'Pending Sale', 'Pending Sale of Current Primary');
-- ... add more rows as needed
```

---

## Local Development

```bash
# Copy the env template and fill in your keys
cp .env.local.example .env.local

# Install dependencies
npm install

# Start dev server
npm run dev
# → opens at http://localhost:3000
```

---

## How Realtime Works

When any user updates a loan, **all other connected users see the change instantly** — no refresh needed. This is powered by Supabase Realtime (Postgres CDC). The green "Realtime sync active" indicator in the table footer confirms the connection is live.

## Security Model

All access control is enforced at the **database level** via Row Level Security (RLS):
- Even if someone inspects the frontend code, they can't bypass permissions
- The Supabase `anon` key is safe to expose — it only grants access that RLS allows
- Processors physically cannot query loans they aren't assigned to
