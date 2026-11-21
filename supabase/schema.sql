-- Mis Plantas — database schema.
-- Lives in a separate schema ("piante") inside an existing Supabase project,
-- so it doesn't mix with the other app's tables.
-- Run once in the SQL Editor (before seed.sql).

create schema if not exists piante;

-- ── Who can use the app ───────────────────────────────────────────────
-- The project's logins are shared with the other app: only the emails
-- listed here can see or edit the plants.
create table piante.utenti (
  email text primary key
);

-- ⚠️ Put your two emails here (lowercase):
insert into piante.utenti (email) values
  ('EMAIL_1@esempio.it'),
  ('EMAIL_2@esempio.it');

create or replace function piante.autorizzato()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from piante.utenti
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ── Plants ───────────────────────────────────────────────────────────
create table piante.piante (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  icona       text,
  archiviata  boolean not null default false,
  creata_il   timestamptz not null default now()
);

-- ── Action types (a new kind of event = a new row here) ──────────────
create table piante.tipi_azione (
  codice  text primary key,
  nome    text not null,
  emoji   text not null,
  ordine  int  not null default 0
);

insert into piante.tipi_azione (codice, nome, emoji, ordine) values
  ('acqua',   'Annaffiatura', '💧', 1),
  ('concime', 'Concimazione', '🌱', 2),
  ('rinvaso', 'Rinvaso',      '🪴', 3);

-- ── Events: one log entry, with one or more actions ──────────────────
create table piante.eventi (
  id          uuid primary key default gen_random_uuid(),
  pianta_id   uuid not null references piante.piante(id) on delete cascade,
  data        date not null,
  nota        text,
  creato_da   uuid default auth.uid() references auth.users(id) on delete set null,
  autore      text default (auth.jwt() ->> 'email'),
  creato_il   timestamptz not null default now()
);

create index eventi_pianta_data on piante.eventi (pianta_id, data desc);

create table piante.evento_azioni (
  evento_id  uuid not null references piante.eventi(id) on delete cascade,
  azione     text not null references piante.tipi_azione(codice),
  primary key (evento_id, azione)
);

-- ── Row Level Security: only the emails in piante.utenti ──────────────
alter table piante.utenti        enable row level security;  -- no policy = inaccessible from the API
alter table piante.piante        enable row level security;
alter table piante.tipi_azione   enable row level security;
alter table piante.eventi        enable row level security;
alter table piante.evento_azioni enable row level security;

create policy "solo autorizzati" on piante.piante
  for all to authenticated using (piante.autorizzato()) with check (piante.autorizzato());
create policy "solo autorizzati" on piante.tipi_azione
  for select to authenticated using (piante.autorizzato());
create policy "solo autorizzati" on piante.eventi
  for all to authenticated using (piante.autorizzato()) with check (piante.autorizzato());
create policy "solo autorizzati" on piante.evento_azioni
  for all to authenticated using (piante.autorizzato()) with check (piante.autorizzato());

-- ── Saves an event and its actions in a single transaction ───────────
create or replace function piante.registra_evento(
  p_pianta_id uuid,
  p_data      date,
  p_azioni    text[],
  p_nota      text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_azioni is null or cardinality(p_azioni) = 0 then
    raise exception 'Serve almeno un''azione';
  end if;
  insert into piante.eventi (pianta_id, data, nota)
    values (p_pianta_id, p_data, p_nota)
    returning id into v_id;
  insert into piante.evento_azioni (evento_id, azione)
    select v_id, unnest(p_azioni);
  return v_id;
end;
$$;

-- ── Permissions for the API (new schemas don't get them automatically) ─
grant usage on schema piante to authenticated;
grant select, insert, update, delete on piante.piante, piante.eventi, piante.evento_azioni to authenticated;
grant select on piante.tipi_azione to authenticated;
revoke all on piante.utenti from anon, authenticated;
revoke execute on function piante.registra_evento, piante.autorizzato from public, anon;
grant execute on function piante.registra_evento, piante.autorizzato to authenticated;
