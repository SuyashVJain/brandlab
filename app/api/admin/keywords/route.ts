import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue, keywordsSchema } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";

/**
 * /api/admin/keywords (admin only)
 * Keywords are secret until the reveal. Only admin routes ever return them;
 * no public route reads this table before reveal_at.
 */

/** GET: the saved list, in order. */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/keywords", async () => {
    const { keywords } = await readAdminState();
    return json({ keywords });
  });
}

/** PUT   body: { keywords: string[] }   Replaces the whole list; array order becomes `position`. */
export async function PUT(request: Request) {
  return adminOnly(request, "api/admin/keywords", async () => {
    const parsed = keywordsSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);

    const sql = db();
    // One transaction: the old list is never visible half-replaced.
    await sql.transaction([
      sql`delete from keywords`,
      sql`
        insert into keywords (word, position)
        select word, position
        from unnest(${parsed.data.keywords}::text[]) with ordinality as list(word, position)
      `,
    ]);
    return json(await readAdminState());
  });
}
