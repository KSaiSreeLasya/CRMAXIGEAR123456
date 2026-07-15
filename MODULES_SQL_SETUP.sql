-- Attendance, Inventory, Admin(Employees) module tables for Supabase
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  phone text,
  role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists email text;
alter table public.employees add column if not exists password_hash text;
create unique index if not exists idx_employees_email_unique on public.employees (lower(email)) where email is not null;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  employee_name text not null,
  attendance_date date not null,
  attendance_time time not null default now()::time,
  status text not null check (status in ('Present', 'Absent', 'Half Day', 'Leave')),
  remark text,
  created_at timestamptz not null default now()
);

alter table public.attendance add column if not exists attendance_time time;
update public.attendance
set attendance_time = coalesce(attendance_time, now()::time)
where attendance_time is null;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  sl_no integer not null,
  model_no text,
  brand text,
  vehicle_model text,
  hsn_no text,
  vehicle_count integer not null default 0,
  chassis_no text,
  motor_no text,
  battery_no text,
  manufacturer_inv_no text,
  battery_model text,
  battery_count integer not null default 0,
  sales_count integer not null default 0,
  closing_stock integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_user_created_at on public.employees (user_id, created_at desc);
create index if not exists idx_attendance_user_date on public.attendance (user_id, attendance_date desc);
create index if not exists idx_inventory_user_sl on public.inventory_items (user_id, sl_no);

-- If projects table already exists, add model_no for Accounts module model lookup
alter table if exists public.projects add column if not exists model_no text;
alter table public.inventory_items add column if not exists model_no text;
alter table public.inventory_items add column if not exists hsn_no text;
alter table public.inventory_items add column if not exists lot_price numeric not null default 0;
alter table public.inventory_items add column if not exists transportation_price numeric not null default 0;
create index if not exists idx_inventory_model_no on public.inventory_items (lower(model_no));

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "employees_select_own" on public.employees;
create policy "employees_select_own" on public.employees
for select using (auth.role() = 'authenticated');

drop policy if exists "employees_insert_own" on public.employees;
create policy "employees_insert_own" on public.employees
for insert with check (auth.uid() = user_id);

drop policy if exists "employees_update_own" on public.employees;
create policy "employees_update_own" on public.employees
for update using (auth.uid() = user_id);

drop policy if exists "employees_delete_own" on public.employees;
create policy "employees_delete_own" on public.employees
for delete using (auth.uid() = user_id);

create or replace function public.create_employee(
  p_full_name text,
  p_email text,
  p_password text,
  p_phone text default null,
  p_role text default null
)
returns setof public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.employees;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  if p_password is null or length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  insert into public.employees (
    user_id,
    full_name,
    email,
    password_hash,
    phone,
    role,
    is_active
  ) values (
    v_user_id,
    trim(p_full_name),
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    nullif(trim(p_phone), ''),
    nullif(trim(p_role), ''),
    true
  )
  returning * into v_row;

  return next v_row;
end;
$$;

create or replace function public.employee_login(
  p_email text,
  p_password text
)
returns table (
  employee_id uuid,
  employee_name text,
  employee_role text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as employee_id,
    e.full_name as employee_name,
    e.role as employee_role
  from public.employees e
  where lower(e.email) = lower(trim(p_email))
    and e.is_active = true
    and e.password_hash = extensions.crypt(p_password, e.password_hash)
  limit 1;
$$;

grant execute on function public.create_employee(text, text, text, text, text) to authenticated;
grant execute on function public.employee_login(text, text) to anon, authenticated;

drop policy if exists "attendance_select_own" on public.attendance;
create policy "attendance_select_own" on public.attendance
for select using (auth.role() = 'authenticated');

drop policy if exists "attendance_insert_own" on public.attendance;
create policy "attendance_insert_own" on public.attendance
for insert with check (auth.uid() = user_id);

drop policy if exists "attendance_update_own" on public.attendance;
create policy "attendance_update_own" on public.attendance
for update using (auth.uid() = user_id);

drop policy if exists "attendance_delete_own" on public.attendance;
create policy "attendance_delete_own" on public.attendance
for delete using (auth.uid() = user_id);

drop policy if exists "inventory_select_own" on public.inventory_items;
create policy "inventory_select_own" on public.inventory_items
for select using (auth.uid() = user_id);

drop policy if exists "inventory_insert_own" on public.inventory_items;
create policy "inventory_insert_own" on public.inventory_items
for insert with check (auth.uid() = user_id);

drop policy if exists "inventory_update_own" on public.inventory_items;
create policy "inventory_update_own" on public.inventory_items
for update using (auth.uid() = user_id);

drop policy if exists "inventory_delete_own" on public.inventory_items;
create policy "inventory_delete_own" on public.inventory_items
for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Attendance enhancements: Weekly Off, optional employee link, monthly payroll
-- ---------------------------------------------------------------------------

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance
  add constraint attendance_status_check
  check (status in ('Present', 'Absent', 'Half Day', 'Leave', 'Weekly Off'));

alter table public.attendance add column if not exists employee_id uuid references public.employees (id) on delete set null;

create index if not exists idx_attendance_employee_id on public.attendance (employee_id);

-- One attendance row per user, employee name, and calendar day.
-- If this fails, remove duplicate rows for the same (user_id, employee_name, attendance_date) first.
create unique index if not exists idx_attendance_user_employee_name_date
  on public.attendance (user_id, employee_name, attendance_date);

create table if not exists public.employee_monthly_payroll (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  employee_id uuid not null references public.employees (id) on delete cascade,
  year_month date not null,
  num_presents numeric(5, 2) not null default 0,
  num_weekly_offs integer not null default 0,
  num_absents integer not null default 0,
  num_leaves integer not null default 0,
  paid_days numeric(5, 2) not null default 0,
  gross_salary numeric(14, 2),
  net_salary numeric(14, 2),
  updated_at timestamptz not null default now (),
  unique (user_id, employee_id, year_month)
);

create index if not exists idx_payroll_user_month on public.employee_monthly_payroll (user_id, year_month desc);

alter table public.employee_monthly_payroll
  alter column num_presents type numeric(5, 2),
  alter column paid_days type numeric(5, 2);

alter table public.employee_monthly_payroll enable row level security;

drop policy if exists "payroll_select_own" on public.employee_monthly_payroll;
drop policy if exists "payroll_insert_own" on public.employee_monthly_payroll;
drop policy if exists "payroll_update_own" on public.employee_monthly_payroll;
drop policy if exists "payroll_delete_own" on public.employee_monthly_payroll;
drop policy if exists "payroll_admin_only" on public.employee_monthly_payroll;

create policy "payroll_admin_only" on public.employee_monthly_payroll
for all using (
  auth.uid() = user_id
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@axigear.in'
)
with check (
  auth.uid() = user_id
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@axigear.in'
);

-- ---------------------------------------------------------------------------
-- Vehicle / battery specs on projects (Sales) and estimations (Estimation cost)
-- ---------------------------------------------------------------------------

alter table if exists public.projects add column if not exists battery_warranty text;
alter table if exists public.projects add column if not exists battery_capacity text;
alter table if exists public.projects add column if not exists kms_range text;
alter table if exists public.projects add column if not exists speed text;
alter table if exists public.projects add column if not exists vehicle_warranty text;

alter table if exists public.estimations add column if not exists battery_warranty text;
alter table if exists public.estimations add column if not exists battery_capacity text;
alter table if exists public.estimations add column if not exists kms_range text;
alter table if exists public.estimations add column if not exists speed text;
alter table if exists public.estimations add column if not exists vehicle_warranty text;
