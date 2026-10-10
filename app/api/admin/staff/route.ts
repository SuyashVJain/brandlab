import { NeonDbError } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffCreateSchema, staffDeleteSchema, staffPasswordSchema, type StaffRow } from "@/lib/jury-schema";

/**
 * /api/admin/staff (admin only): manage admin and jury accounts.
 * Password hashes never leave the database.
 */

const BCRYPT_COST = 12;

async function listStaff(): Promise<StaffRow[]> {
  const rows = await db()`select id, email, role, created_at from staff order by role, email`;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

/** GET: every staff account (id, email, role, created_at). */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/staff", async () => json({ staff: await listStaff() }));
}

/** POST   body: { email, password, role }   Creates an account. 409 when the email is taken. */
export async function POST(request: Request) {
  return adminOnly(request, "api/admin/staff", async () => {
    const parsed = staffCreateSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const { email, password, role } = parsed.data;

    const hash = await bcrypt.hash(password, BCRYPT_COST);
    try {
      await db()`insert into staff (email, password_hash, role) values (${email}, ${hash}, ${role}::staff_role)`;
    } catch (error) {
      if (error instanceof NeonDbError && error.code === "23505") {
        return json({ error: "A staff account with this email already exists." }, 409);
      }
      throw error;
    }
    return json({ staff: await listStaff() }, 201);
  });
}

/** PATCH   body: { id, password }   Resets that account's password. */
export async function PATCH(request: Request) {
  return adminOnly(request, "api/admin/staff", async () => {
    const parsed = staffPasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);

    const hash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    const rows = await db()`update staff set password_hash = ${hash} where id = ${parsed.data.id} returning id`;
    if (rows.length === 0) return json({ error: "That staff account no longer exists." }, 404);
    return json({ ok: true });
  });
}

/** DELETE   body: { id }   Refuses (409) to delete yourself or the last remaining admin. */
export async function DELETE(request: Request) {
  return adminOnly(request, "api/admin/staff", async (me) => {
    const parsed = staffDeleteSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const { id } = parsed.data;

    if (id === me.id) return json({ error: "You cannot delete your own account." }, 409);

    const sql = db();
    try {
      // The "last admin" rule is part of the delete itself, so two admins
      // removing each other at the same moment cannot leave the site with none.
      const deleted = await sql`
        delete from staff
        where id = ${id}
          and not (role = 'admin' and (select count(*) from staff where role = 'admin') <= 1)
        returning id
      `;
      if (deleted.length === 0) {
        const [target] = await sql`select role from staff where id = ${id}`;
        if (!target) return json({ error: "That staff account no longer exists." }, 404);
        return json({ error: "This is the last admin account. Add another admin first." }, 409);
      }
    } catch (error) {
      // scores.judge_id references staff: a judge who has scored cannot be removed.
      if (error instanceof NeonDbError && error.code === "23503") {
        return json({ error: "This judge has saved scores, so the account cannot be deleted." }, 409);
      }
      throw error;
    }
    return json({ staff: await listStaff() });
  });
}
