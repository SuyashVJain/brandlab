// Removes exactly the DUMMY data created by scripts/seed-dummy.mjs, and nothing else:
//   - participants with an email like dummy-NN@example.com
//     (their submissions, the scores on those submissions and the per-criterion values go with them)
//   - the dummy judges dummy-juryN@example.com and every score they gave
//   - the generated posters in public/dummy-posters/
// Real participants, submissions, scores, staff, criteria, keywords and the event state are
// not touched, and neither is participant_code_seq. Safe to run more than once.
//
//   npm run db:clear-dummy

import { rm } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { DUMMY_JURY_EMAIL, DUMMY_PARTICIPANT_EMAIL, POSTER_DIR, ROOT } from "./dummy-lib.mjs";

dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

console.log("This removes DUMMY data from the database configured in .env.local (DATABASE_URL).\n");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const counts = async () =>
  (
    await sql`
      select (select count(*)::int from participants) as participants,
             (select count(*)::int from submissions) as submissions,
             (select count(*)::int from scores) as scores,
             (select count(*)::int from staff) as staff
    `
  )[0];

try {
  const before = await counts();

  // One transaction: scores first (a judge cannot be deleted while their scores exist),
  // then the participants (submissions cascade), then the dummy judges.
  const [byJudges, onDummy, participants, judges] = await sql.transaction([
    sql`delete from scores where judge_id in (select id from staff where email like ${DUMMY_JURY_EMAIL}) returning id`,
    sql`
      delete from scores where submission_id in (
        select s.id from submissions s join participants p on p.id = s.participant_id
        where p.email like ${DUMMY_PARTICIPANT_EMAIL}
      ) returning id
    `,
    sql`delete from participants where email like ${DUMMY_PARTICIPANT_EMAIL} returning code`,
    sql`delete from staff where email like ${DUMMY_JURY_EMAIL} and role = 'jury' returning email`,
  ]);

  await rm(POSTER_DIR, { recursive: true, force: true });

  const after = await counts();
  console.log(`deleted participants: ${participants.length}${participants.length ? ` (${participants.map((row) => row.code).sort().join(", ")})` : ""}`);
  console.log(`deleted submissions:  ${before.submissions - after.submissions}`);
  console.log(`deleted scores:       ${byJudges.length + onDummy.length}`);
  console.log(`deleted dummy judges: ${judges.length}${judges.length ? ` (${judges.map((row) => row.email).sort().join(", ")})` : ""}`);
  console.log("deleted posters:      public/dummy-posters/ removed");
  console.log(`\nleft in the database: ${after.participants} participants, ${after.submissions} submissions, ${after.scores} scores, ${after.staff} staff`);
  if (participants.length + judges.length + byJudges.length + onDummy.length === 0) console.log("Nothing to remove: there was no dummy data.");
} catch (error) {
  console.error(`Clear error: ${error.message}`);
  process.exitCode = 1;
}
