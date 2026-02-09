-- ============================================================
-- LoanPilot — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. TEAM MEMBERS / PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('Lender', 'Processor', 'Assistant')),
  color text default '#2563eb',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone on the team can read all profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 2. LOANS
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower text not null,
  amount numeric not null default 0,
  purpose text not null check (purpose in ('Purchase', 'Refi')),
  loan_type text not null check (loan_type in ('Conventional', 'VA', 'FHA', 'USDA', 'Jumbo')),
  locked boolean default false,
  lock_exp date,
  processor_id uuid references public.profiles(id),
  sub_date date,
  cr_date date,
  coe_date date,
  status text not null default 'Active' check (status in (
    'Active', 'CTC', 'Submitted', 'Approved w/ Conditions', 'Suspended',
    'Pending Sale', 'Funded', 'Paid', 'Denied', 'Withdrawn'
  )),
  notes text default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.loans enable row level security;

-- Lenders & Assistants see all loans; Processors see only their assigned loans
create policy "Lenders and Assistants see all loans"
  on public.loans for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('Lender', 'Assistant')
    )
  );

create policy "Processors see only assigned loans"
  on public.loans for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'Processor'
    )
    and processor_id = auth.uid()
  );

-- Lenders can insert loans
create policy "Lenders can insert loans"
  on public.loans for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'Lender'
    )
  );

-- Lenders can update any loan; Processors can update their assigned loans
create policy "Lenders can update any loan"
  on public.loans for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'Lender'
    )
  );

create policy "Processors can update assigned loans"
  on public.loans for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'Processor'
    )
    and processor_id = auth.uid()
  );

-- Lenders can delete loans
create policy "Lenders can delete loans"
  on public.loans for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'Lender'
    )
  );

-- 3. ACTIVITY LOG
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  details text,
  created_at timestamptz default now()
);

alter table public.activity_log enable row level security;

create policy "Activity log viewable by authenticated users"
  on public.activity_log for select
  to authenticated
  using (true);

create policy "Authenticated users can insert activity"
  on public.activity_log for insert
  to authenticated
  with check (true);

-- 4. AUTO-UPDATE updated_at TRIGGER
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_loan_updated
  before update on public.loans
  for each row execute function public.handle_updated_at();

-- 5. REALTIME — enable for live updates
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.activity_log;

-- 6. INDEXES for performance
create index idx_loans_processor on public.loans(processor_id);
create index idx_loans_status on public.loans(status);
create index idx_activity_loan on public.activity_log(loan_id);
