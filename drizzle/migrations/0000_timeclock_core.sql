-- Roles and punch types
create type public.app_role as enum ('supervisor', 'empleado');
create type public.punch_type as enum ('entrada', 'salida_temporal', 'regreso', 'salida');

-- Plants / branches with optional GPS zone
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision,
  longitude double precision,
  radius_m integer not null default 200,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sites to authenticated;
grant all on public.sites to service_role;
alter table public.sites enable row level security;

-- Roles (separate table)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Own roles or supervisor" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'supervisor'));

-- Employees: pre-registered by a supervisor, claimed at sign-up
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  employee_number text not null unique,
  email text not null unique,
  full_name text not null,
  job_title text not null default '',
  site_id uuid references public.sites(id) on delete set null,
  shift_start time not null default '08:00',
  shift_hours numeric(4,2) not null default 8,
  role public.app_role not null default 'empleado',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;

create policy "Own record or supervisor can read" on public.employees
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'supervisor'));
create policy "Supervisor adds employees" on public.employees
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'supervisor'));
create policy "Own record or supervisor can update" on public.employees
  for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'supervisor'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'supervisor'));
create policy "Supervisor removes employees" on public.employees
  for delete to authenticated
  using (public.has_role(auth.uid(), 'supervisor'));

create policy "Anyone signed in reads sites" on public.sites
  for select to authenticated using (true);
create policy "Supervisor adds sites" on public.sites
  for insert to authenticated with check (public.has_role(auth.uid(), 'supervisor'));
create policy "Supervisor edits sites" on public.sites
  for update to authenticated
  using (public.has_role(auth.uid(), 'supervisor'))
  with check (public.has_role(auth.uid(), 'supervisor'));
create policy "Supervisor removes sites" on public.sites
  for delete to authenticated using (public.has_role(auth.uid(), 'supervisor'));

-- Employees may only change their own photo; everything else is supervisor-only
create or replace function public.guard_employee_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is null or public.has_role(auth.uid(), 'supervisor') then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.employee_number is distinct from old.employee_number
     or new.email is distinct from old.email
     or new.full_name is distinct from old.full_name
     or new.job_title is distinct from old.job_title
     or new.site_id is distinct from old.site_id
     or new.shift_start is distinct from old.shift_start
     or new.shift_hours is distinct from old.shift_hours
     or new.role is distinct from old.role then
    raise exception 'Solo un supervisor puede cambiar estos datos';
  end if;
  return new;
end;
$$;
create trigger employees_guard_update
  before update on public.employees
  for each row execute function public.guard_employee_update();

-- Keep user_roles in sync when a supervisor changes someone's role
create or replace function public.sync_employee_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.role is distinct from old.role then
    delete from public.user_roles where user_id = new.user_id;
    insert into public.user_roles (user_id, role) values (new.user_id, new.role);
  end if;
  return new;
end;
$$;
create trigger employees_sync_role
  after update of role on public.employees
  for each row execute function public.sync_employee_role();

-- Normalise email / employee number on write
create or replace function public.normalize_employee()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  new.employee_number := trim(new.employee_number);
  return new;
end;
$$;
create trigger employees_normalize
  before insert or update on public.employees
  for each row execute function public.normalize_employee();

-- Is the app still waiting for its first supervisor?
create or replace function public.app_needs_setup()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.user_roles where role = 'supervisor')
$$;
grant execute on function public.app_needs_setup() to anon, authenticated;

-- Sign-up: first account becomes supervisor; afterwards the email + employee number
-- must match a record a supervisor pre-registered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  emp public.employees;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  perform pg_advisory_xact_lock(hashtext('timeclock_signup'));
  if not exists (select 1 from public.user_roles where role = 'supervisor') then
    insert into public.employees (user_id, employee_number, email, full_name, job_title, role)
    values (
      new.id,
      coalesce(nullif(trim(meta->>'employee_number'), ''), 'SUP-1'),
      lower(new.email),
      coalesce(nullif(trim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
      'Supervisor',
      'supervisor'
    );
    insert into public.user_roles (user_id, role) values (new.id, 'supervisor');
    return new;
  end if;

  select * into emp from public.employees
   where email = lower(new.email)
     and employee_number = trim(coalesce(meta->>'employee_number', ''))
     and user_id is null
   for update;
  if not found then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  update public.employees set user_id = new.id where id = emp.id;
  insert into public.user_roles (user_id, role) values (new.id, emp.role);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Punches
create table public.punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type public.punch_type not null,
  at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  distance_m double precision,
  in_zone boolean,
  created_at timestamptz not null default now()
);
create index punches_user_at_idx on public.punches (user_id, at desc);
create index punches_at_idx on public.punches (at desc);
grant select, insert on public.punches to authenticated;
grant all on public.punches to service_role;
alter table public.punches enable row level security;

create policy "Own punches or supervisor can read" on public.punches
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'supervisor'));
create policy "Employees add their own punches" on public.punches
  for insert to authenticated
  with check (user_id = auth.uid());

-- Server time, valid sequence and GPS zone are enforced here, not in the app
create or replace function public.validate_punch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_type public.punch_type;
  emp public.employees;
  site public.sites;
  dist double precision;
  tolerance double precision;
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.at := now();
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select * into emp from public.employees where user_id = new.user_id;
  if not found then
    raise exception 'Tu cuenta no está dada de alta como empleado';
  end if;

  select type into last_type from public.punches
   where user_id = new.user_id order by at desc, created_at desc limit 1;

  if (last_type is null or last_type = 'salida') and new.type <> 'entrada' then
    raise exception 'Primero checa tu entrada';
  elsif last_type in ('entrada', 'regreso') and new.type not in ('salida_temporal', 'salida') then
    raise exception 'Ya estás en turno';
  elsif last_type = 'salida_temporal' and new.type not in ('regreso', 'salida') then
    raise exception 'Primero checa tu regreso';
  end if;

  new.distance_m := null;
  new.in_zone := null;
  if emp.site_id is not null then
    select * into site from public.sites where id = emp.site_id;
    if site.latitude is not null and site.longitude is not null then
      if new.latitude is null or new.longitude is null then
        raise exception 'Activa tu ubicación para checar';
      end if;
      dist := 2 * 6371000 * asin(sqrt(
        power(sin(radians(new.latitude - site.latitude) / 2), 2) +
        cos(radians(site.latitude)) * cos(radians(new.latitude)) *
        power(sin(radians(new.longitude - site.longitude) / 2), 2)
      ));
      tolerance := least(coalesce(new.accuracy_m, 0), 100);
      new.distance_m := round(dist::numeric, 0);
      new.in_zone := dist <= site.radius_m + tolerance;
      if not new.in_zone then
        raise exception 'Estás fuera de la zona de % (a % m)', site.name, round(dist::numeric, 0);
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger punches_validate
  before insert on public.punches
  for each row execute function public.validate_punch();