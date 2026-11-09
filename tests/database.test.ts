import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite({ extensions: { vector } });
const alice = "8ea89010-4dae-4d87-980b-614eeb2c7d02";
const bob = "49fba0ef-8d64-4f10-81fc-c6d92b80dc43";

async function asUser(user: string) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
}

const migration = new URL("../supabase/migrations/202611100001_nexus.sql", import.meta.url);

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${alice}'), ('${bob}');
  `);
  await db.exec(await readFile(migration, "utf8"));
}, 25000);

afterAll(async () => { await db.close(); });

describe("database migration with Supabase role fixtures", () => {
  it("isolates backups, blocks direct writes and preserves revisions after deletion", async () => {
    const save = (revision: number, data: string | null) => db.query<{ revision: number | null }>(
      "select public.nexus_write_backup($1, $2::jsonb) as revision", [revision, data]
    ).then(result => result.rows[0].revision);

    await asUser(alice);
    const payload = '{"version":1,"entries":[],"relations":[]}';
    expect(await save(0, payload)).toBe(1);
    expect(await save(0, payload)).toBeNull();
    await expect(db.query("update public.nexus_backups set revision = 5")).rejects.toThrow(/permission denied/);

    await asUser(bob);
    expect((await db.query("select * from public.nexus_backups")).rows).toHaveLength(0);
    expect(await save(1, null)).toBeNull();
    expect(await save(0, payload)).toBe(1);

    await asUser(alice);
    expect(await save(1, null)).toBe(2);
    expect(await save(0, payload)).toBeNull();
    expect(await save(2, payload)).toBe(3);
    expect((await db.query("select owner from public.nexus_backups")).rows).toEqual([{ owner: alice }]);
  });

  it("isolates vectors and enforces per-account AI quota", async () => {
    await asUser(alice);
    const hash = "a".repeat(64);
    const embedding = JSON.stringify(Array(1024).fill(0.01));
    const insert = (owner: string) => db.query("insert into public.nexus_embeddings values ($1, $2, $3)", [owner, hash, embedding]);
    await insert(alice);
    await expect(insert(bob)).rejects.toThrow(/row-level security/);

    const reserve = () => db.query<{ allowed: boolean }>("select public.nexus_reserve_ai() as allowed").then(result => result.rows[0].allowed);
    for (let n = 0; n < 8; n++) expect(await reserve()).toBe(true);
    expect(await reserve()).toBe(false);

    await asUser(bob);
    expect((await db.query("select hash from public.nexus_embeddings")).rows).toEqual([]);
    expect(await reserve()).toBe(true);
    await db.exec("set role anon");
    await expect(reserve()).rejects.toThrow(/permission denied/);
  });
});
