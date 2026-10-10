// Runs every .sql file in db/migrations/ in filename order.
// Safe to run again: applied filenames are recorded in schema_migrations and skipped.
//
//   npm run db:migrate
//
// Reads DATABASE_URL from .env.local. The URL is never printed.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "db", "migrations");

dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

// A migration file holds many statements, so this uses a real session
// (WebSocket) instead of the one-statement HTTP driver. Node 22+ has WebSocket built in.
const client = new Client({ connectionString: url });

try {
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const applied = new Set(
    (await client.query("select filename from schema_migrations")).rows.map((row) => row.filename),
  );
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    // One transaction per file: it either applies completely or not at all.
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${file} failed and was rolled back: ${error.message}`);
    }
    console.log(`ran   ${file}`);
    ran++;
  }

  console.log(ran === 0 ? "Nothing to do. Database is up to date." : `Done. ${ran} migration(s) applied.`);
} catch (error) {
  // Message only: never dump the error object, it can carry connection details.
  console.error(`Migration error: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
