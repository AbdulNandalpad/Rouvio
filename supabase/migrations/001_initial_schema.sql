-- Rouvio initial schema
-- Run in Supabase SQL editor or via supabase db push

-- Users table (mirrors Supabase Auth, extended with app preferences)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  preferred_language text not null default 'de' check (preferred_language in ('de', 'en')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Trips table
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null default 'Meine Reise',
  from_name text not null,
  to_name text not null,
  from_coords point not null,
  to_coords point not null,
  route_polyline text not null,
  route_distance_km numeric(8,2),
  route_duration_hr numeric(6,2),
  settings_json jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
create policy "Users can CRUD own trips" on public.trips for all using (auth.uid() = user_id);

-- Trip stops (POIs added to a trip in order)
create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  osm_id text not null,
  name text not null,
  category text not null,
  coords point not null,
  position integer not null,
  notes text,
  added_at timestamptz not null default now()
);

alter table public.trip_stops enable row level security;
create policy "Users can CRUD stops on own trips" on public.trip_stops for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- POI cache (Claude-enriched descriptions, 24h TTL managed by app layer)
create table if not exists public.poi_cache (
  osm_id text primary key,
  name text not null,
  category text not null,
  coords point,
  description_de text,
  description_en text,
  opening_hours text,
  tags_json jsonb default '{}',
  cached_at timestamptz not null default now()
);

-- No RLS needed — poi_cache is read by all, written only by server role
alter table public.poi_cache enable row level security;
create policy "Anyone can read POI cache" on public.poi_cache for select using (true);

-- Agent sessions (RODI conversation history per trip)
create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  messages_json jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.agent_sessions enable row level security;
create policy "Users can access own agent sessions" on public.agent_sessions for all using (auth.uid() = user_id);

-- Shared trip links
create table if not exists public.shared_trips (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  slug text not null unique,
  expires_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shared_trips enable row level security;
create policy "Anyone can view shared trips" on public.shared_trips for select using (true);
create policy "Trip owner can manage shared links" on public.shared_trips for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
