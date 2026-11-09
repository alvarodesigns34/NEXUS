begin;

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to authenticated;

create table public.nexus_backups (
  owner uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  workspace jsonb check (jsonb_typeof(workspace) = 'object' and octet_length(workspace::text) <= 3300000),
  updated_at timestamptz not null default now()
);
alter table public.nexus_backups enable row level security;
revoke all on public.nexus_backups from public, anon, authenticated;
grant select on public.nexus_backups to authenticated;
create policy nexus_backup_read on public.nexus_backups for select to authenticated using ((select auth.uid()) = owner);

create function public.nexus_write_backup(expected_revision integer, next_workspace jsonb)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  account uuid := auth.uid();
  result integer;
begin
  if account is null or expected_revision < 0 then return null; end if;
  if next_workspace is null then
    update public.nexus_backups set revision = revision + 1, workspace = null, updated_at = now()
    where owner = account and revision = expected_revision returning revision into result;
  elsif expected_revision = 0 then
    insert into public.nexus_backups (owner, revision, workspace) values (account, 1, next_workspace)
    on conflict (owner) do nothing returning revision into result;
  else
    update public.nexus_backups set revision = revision + 1, workspace = next_workspace, updated_at = now()
    where owner = account and revision = expected_revision returning revision into result;
  end if;
  return result;
end
$$;
revoke all on function public.nexus_write_backup(integer, jsonb) from public, anon, authenticated;
grant execute on function public.nexus_write_backup(integer, jsonb) to authenticated;

create table public.nexus_embeddings (
  owner uuid not null references auth.users(id) on delete cascade,
  hash text not null check (hash ~ '^[a-f0-9]{64}$'),
  embedding extensions.vector(1024) not null,
  primary key (owner, hash)
);
alter table public.nexus_embeddings enable row level security;
revoke all on public.nexus_embeddings from public, anon, authenticated;
grant select, insert, delete on public.nexus_embeddings to authenticated;
create policy nexus_embeddings_read on public.nexus_embeddings for select to authenticated using ((select auth.uid()) = owner);
create policy nexus_embeddings_add on public.nexus_embeddings for insert to authenticated with check ((select auth.uid()) = owner);
create policy nexus_embeddings_remove on public.nexus_embeddings for delete to authenticated using ((select auth.uid()) = owner);

create schema if not exists nexus_private;

create function nexus_private.limit_embeddings()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner::text, 1834));
  if (select count(*) from public.nexus_embeddings where owner = new.owner) >= 1200 then
    raise exception 'Embedding cache capacity exceeded' using errcode = 'NX002';
  end if;
  return new;
end
$$;
revoke all on function nexus_private.limit_embeddings() from public, anon, authenticated;
create trigger nexus_embedding_limit before insert on public.nexus_embeddings
  for each row execute function nexus_private.limit_embeddings();

create table nexus_private.ai_quota (
  bucket text not null,
  day date not null,
  used integer not null,
  primary key (bucket, day)
);
revoke all on schema nexus_private from public, anon, authenticated;

create function public.nexus_reserve_ai()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  account uuid := auth.uid();
  today date := timezone('UTC', now())::date;
  reserved integer;
begin
  if account is null then return false; end if;
  begin
    insert into nexus_private.ai_quota as q values (account::text, today, 1)
      on conflict (bucket, day) do update set used = q.used + 1 where q.used < 8
      returning used into reserved;
    if reserved is null then return false; end if;
    insert into nexus_private.ai_quota as q values ('global', today, 1)
      on conflict (bucket, day) do update set used = q.used + 1 where q.used < 100
      returning used into reserved;
    if reserved is null then raise exception 'quota' using errcode = 'NX001'; end if;
  exception when sqlstate 'NX001' then
    return false;
  end;
  return true;
end
$$;
revoke all on function public.nexus_reserve_ai() from public, anon, authenticated;
grant execute on function public.nexus_reserve_ai() to authenticated;

commit;
