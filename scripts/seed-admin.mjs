// Creates the first admin, or resets the password of an existing staff email.
//
// ADMIN_EMAIL and ADMIN_PASSWORD must come from the command line, never a file:
//
//   PowerShell:  $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="..."; npm run db:seed-admin
//   bash:        ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:seed-admin
//
// The password is hashed with bcrypt (cost 12) and is never printed.

import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

// Read these BEFORE loading .env.local, so values in a file can never be used.
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD as environment variables on the command line.");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL does not look like an email address.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const hash = await bcrypt.hash(password, 12);

  // New email: insert as admin. Existing email: only the hash changes.
  const rows = await sql`
    insert into staff (email, password_hash, role)
    values (${email}, ${hash}, 'admin')
    on conflict (email) do update set password_hash = excluded.password_hash
    returning role, (xmax = 0) as created
  `;

  const { role, created } = rows[0];
  console.log(
    created
      ? `Admin created: ${email}`
      : `Password updated for existing staff account: ${email} (role: ${role})`,
  );
} catch (error) {
  console.error(`Seed error: ${error.message}`);
  process.exitCode = 1;
}
