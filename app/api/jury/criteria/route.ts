import { json, requireStaff } from "@/lib/auth";
import { readCriteria } from "@/lib/criteria";

/** GET /api/jury/criteria (jury and admin): ordered list { id, position, label, max_points }. */
export async function GET(request: Request) {
  const staff = await requireStaff(request, ["admin", "jury"]);
  if (staff instanceof Response) return staff;

  try {
    return json({ criteria: await readCriteria() });
  } catch (error) {
    console.error("[api/jury/criteria]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
