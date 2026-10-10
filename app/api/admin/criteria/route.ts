import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { criteriaLocked, readCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { CRITERIA_LOCKED, criteriaSchema, type CriteriaData } from "@/lib/jury-schema";

/** /api/admin/criteria (admin only): the judging criteria. */

async function current(): Promise<CriteriaData> {
  const [criteria, locked] = await Promise.all([readCriteria(), criteriaLocked()]);
  return { criteria, locked };
}

/** GET: ordered list { id, position, label, max_points }, plus whether editing is locked. */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/criteria", async () => json(await current()));
}

/**
 * PUT   body: { criteria: [{ id?, label, max_points }] }   Replaces the list.
 * 3 to 8 criteria, max points adding up to exactly 100. Refused with 409 once
 * any score exists. Criteria that already exist keep their id (updated in
 * place); new ones are inserted; the ones left out are deleted.
 */
export async function PUT(request: Request) {
  return adminOnly(request, "api/admin/criteria", async () => {
    const parsed = criteriaSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);

    // One statement = one transaction. Every change is guarded by "no score
    // exists", checked in the same statement, so the list cannot change under
    // a judge who is saving at that moment.
    const [result] = await db()`
      with input as (
        select (item.value->>'id')::int as id,
               item.value->>'label' as label,
               (item.value->>'max_points')::int as max_points,
               item.ordinality::int as position
        from jsonb_array_elements(${JSON.stringify(parsed.data.criteria)}::jsonb) with ordinality as item
      ),
      unlocked as (
        select not exists (select 1 from scores) as ok
      ),
      updated as (
        update criteria c
        set label = i.label, max_points = i.max_points, position = i.position
        from input i, unlocked u
        where u.ok and c.id = i.id
        returning c.id
      ),
      inserted as (
        insert into criteria (position, label, max_points)
        select i.position, i.label, i.max_points
        from input i, unlocked u
        where u.ok and (i.id is null or i.id not in (select id from criteria))
        returning id
      ),
      deleted as (
        delete from criteria c
        using unlocked u
        where u.ok and c.id not in (select id from input where id is not null)
        returning c.id
      )
      select (select ok from unlocked) as ok,
             (select count(*) from updated) + (select count(*) from inserted) + (select count(*) from deleted) as changed
    `;
    if (!result?.ok) return json({ error: CRITERIA_LOCKED }, 409);

    return json(await current());
  });
}
