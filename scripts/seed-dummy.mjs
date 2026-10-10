// Fills the database with removable DUMMY data so the whole flow can be tried:
// 12 teams (8 individuals, 4 pairs) with submissions and generated posters, two dummy
// judges, and scores from both judges for 10 of the 12 teams.
//
//   npm run db:seed-dummy            refuses if real participants, submissions or scores exist
//   npm run db:seed-dummy -- --force seeds next to real data anyway
//   npm run db:clear-dummy           removes every dummy row and poster again
//
// Dummy rows are marked by their emails (dummy-NN@example.com, dummy-juryN@example.com) and
// use the reserved codes BL-9001 to BL-9012. participant_code_seq is never touched.
// Posters are written to public/dummy-posters/ (ignored by git); no Vercel Blob objects are made.

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import {
  Canvas,
  COLOURS,
  DUMMY_JURY_EMAIL,
  DUMMY_PARTICIPANT_EMAIL,
  POSTER_DIR,
  POSTER_URL,
  ROOT,
} from "./dummy-lib.mjs";

dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });
const force = process.argv.includes("--force");

console.log("WARNING: this writes DUMMY data to the database configured in .env.local (DATABASE_URL).");
console.log("         Run `npm run db:clear-dummy` to remove it. Do that before the real event.\n");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

/* ---------- the 12 teams ---------- */

// Same programme list as lib/site-content.ts (registration.programs).
const PROGRAMS = ["B.Tech CSIT", "B.Tech SAR", "B.Tech AIML", "B.Sc SAR"];

const TEAMS = [
  { name: "Aarav Sharma", event: "Inkwell Fest", tagline: "Where every idea leaves a mark" },
  { name: "Diya Patel", partner: "Kabir Mehta", event: "Pixel Parade", tagline: "A march of tiny bright ideas" },
  { name: "Rohan Verma", event: "Brand Bazaar", tagline: "Trade in names, not goods" },
  { name: "Ananya Iyer", event: "Logo Mela", tagline: "Marks that mean something" },
  { name: "Vivaan Joshi", partner: "Ishita Nair", event: "Type Yatra", tagline: "A journey through letters" },
  { name: "Meera Kulkarni", event: "Colour Sangam", tagline: "Where palettes meet" },
  { name: "Arjun Reddy", event: "Sketch Utsav", tagline: "Draw first, decide later" },
  { name: "Saanvi Gupta", partner: "Aditya Rao", event: "Idea Junction", tagline: "All lines cross here" },
  { name: "Kunal Deshmukh", event: "Motif Mahotsav", tagline: "Patterns worth repeating" },
  { name: "Tanvi Bhatt", event: "Canvas Carnival", tagline: "Step right up and paint" },
  { name: "Nikhil Chauhan", partner: "Riya Malhotra", event: "Font Fiesta", tagline: "Every face has a voice" },
  { name: "Pooja Saxena", event: "Palette Summit", tagline: "Colour at the top" },
].map((team, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    ...team,
    number,
    code: `BL-90${number}`,
    email: `dummy-${number}@example.com`,
    phone: `90000090${number}`,
    enrollment: `DUMMY2026${number}`,
    partnerEnrollment: team.partner ? `DUMMY2026P${number}` : null,
    program: PROGRAMS[index % PROGRAMS.length],
    semester: (index % 4) * 2 + 1,
    partnerPhone: team.partner ? `90000091${number}` : null,
    partnerProgram: team.partner ? PROGRAMS[(index + 1) % PROGRAMS.length] : null,
    partnerSemester: team.partner ? ((index + 1) % 4) * 2 + 1 : null,
    file: `${number}-${team.event.toLowerCase().replace(/[^a-z]+/g, "-")}.png`,
  };
});

/**
 * Who gets scored, best first, as a share of the maximum. Teams are listed by
 * their position in TEAMS so the ranking does not simply follow the codes.
 * The 4th and 5th entries tie on the total on purpose; the 5th has fewer points
 * on the first criterion, so the tie-break puts it below the 4th.
 * Two teams (Motif Mahotsav and Palette Summit) are left unscored.
 */
const RANKING = [
  { team: 4, share: 0.96 },
  { team: 1, share: 0.9 },
  { team: 9, share: 0.84 },
  { team: 6, share: 0.78 },
  { team: 2, tieWithPrevious: true },
  { team: 0, share: 0.7 },
  { team: 7, share: 0.63 },
  { team: 10, share: 0.56 },
  { team: 3, share: 0.48 },
  { team: 5, share: 0.4 },
];

/* ---------- posters ---------- */

const WIDTH = 800;
const HEIGHT = 1100;

function drawPoster(team, index) {
  const { paper, ink, blue, yellow } = COLOURS;
  const canvas = new Canvas(WIDTH, HEIGHT, paper);

  // Top half: one of four simple compositions in the site palette.
  switch (index % 4) {
    case 0:
      canvas.circle(540, 290, 210, yellow);
      canvas.rect(60, 330, 300, 150, ink);
      canvas.rect(60, 250, 110, 60, blue);
      break;
    case 1:
      canvas.rect(0, 0, WIDTH, 300, blue);
      canvas.circle(230, 300, 170, yellow);
      canvas.rect(470, 240, 270, 240, ink);
      break;
    case 2:
      canvas.rect(60, 120, 680, 110, ink);
      canvas.rect(60, 250, 440, 110, yellow);
      canvas.rect(60, 380, 230, 110, blue);
      canvas.circle(630, 400, 100, ink);
      break;
    default:
      canvas.rect(0, 0, WIDTH, 500, yellow);
      canvas.circle(400, 280, 190, ink);
      canvas.circle(400, 280, 100, blue);
      break;
  }

  // Small label and the team's number.
  canvas.text("BRAND LAB", 60, 56, 5, index % 4 === 1 ? paper : ink);
  canvas.text(`NO ${"ABCDEFGHIJKL"[index]}`, 60, 1030, 4, ink);
  canvas.rect(60, 1010, 680, 6, ink);

  // The event name in big block type, one word per line, as large as fits.
  const words = team.event.toUpperCase().split(" ");
  const longest = Math.max(...words.map((word) => Canvas.textWidth(word, 1)));
  const scale = Math.min(26, Math.floor(680 / longest), Math.floor(380 / (words.length * 9)));
  let y = 570;
  words.forEach((word, line) => {
    // A yellow swipe behind the last word, like the site's headings.
    if (line === words.length - 1) canvas.rect(48, y - scale, Canvas.textWidth(word, scale) + 24, scale * 9, yellow);
    canvas.text(word, 60, y, scale, ink);
    y += scale * 9;
  });
  canvas.rect(60, y + 10, 220, 14, blue);
  return canvas.png();
}

/* ---------- scores ---------- */

/** Points per criterion for a share of the maximum (0..1), never above a criterion's max. */
const pointsFor = (criteria, share) => criteria.map((criterion) => Math.round(criterion.max_points * share));

/** Same total as `points`, but 2 fewer on the first criterion (moved to another one). */
function sameTotalLowerFirst(criteria, points) {
  const next = [...points];
  const other = criteria.findIndex((criterion, index) => index > 0 && next[index] + 2 <= criterion.max_points);
  if (other === -1 || next[0] < 2) throw new Error("could not build the tie; adjust RANKING");
  next[0] -= 2;
  next[other] += 2;
  return next;
}

/** The second judge differs slightly: one more point on one criterion where there is room. */
function secondOpinion(criteria, points, seed) {
  const next = [...points];
  const at = seed % criteria.length;
  if (next[at] < criteria[at].max_points) next[at] += 1;
  return next;
}

/* ---------- run ---------- */

try {
  const [existing] = await sql`
    select
      (select count(*)::int from participants where email not like ${DUMMY_PARTICIPANT_EMAIL}) as real_participants,
      (select count(*)::int from submissions s join participants p on p.id = s.participant_id
        where p.email not like ${DUMMY_PARTICIPANT_EMAIL}) as real_submissions,
      (select count(*)::int from scores sc join submissions s on s.id = sc.submission_id
        join participants p on p.id = s.participant_id
        where p.email not like ${DUMMY_PARTICIPANT_EMAIL}) as real_scores,
      (select count(*)::int from participants where email like ${DUMMY_PARTICIPANT_EMAIL}) as dummy_participants,
      (select count(*)::int from staff where email like ${DUMMY_JURY_EMAIL}) as dummy_judges,
      (select count(*)::int from participants where code between 'BL-9001' and 'BL-9012') as reserved_codes
  `;

  if (existing.dummy_participants > 0 || existing.dummy_judges > 0) {
    console.error("Dummy data is already in the database. Run `npm run db:clear-dummy` first, then seed again.");
    process.exit(1);
  }
  if (existing.reserved_codes > 0) {
    console.error("The reserved codes BL-9001 to BL-9012 are already used by other participants. Nothing was written.");
    process.exit(1);
  }
  const real = existing.real_participants + existing.real_submissions + existing.real_scores;
  if (real > 0 && !force) {
    console.error(
      `Refusing to seed: real data exists (${existing.real_participants} participants, ${existing.real_submissions} submissions, ${existing.real_scores} scores).`,
    );
    console.error("If you really want dummy data next to it, run: npm run db:seed-dummy -- --force");
    process.exit(1);
  }
  if (real > 0) console.log("--force given: seeding next to existing real data.\n");

  const criteria = await sql`select id, label, max_points from criteria order by position, id`;
  if (criteria.length === 0) throw new Error("no judging criteria in the database; run npm run db:migrate first");

  // 1) posters
  await mkdir(POSTER_DIR, { recursive: true });
  for (const [index, team] of TEAMS.entries()) {
    await writeFile(path.join(POSTER_DIR, team.file), drawPoster(team, index));
  }
  console.log(`posters:      ${TEAMS.length} PNG files (${WIDTH} x ${HEIGHT}) in public/dummy-posters/`);

  // 2) everything else, in one transaction (all of it or none of it)
  const judges = [1, 2].map((number) => ({
    id: randomUUID(),
    email: `dummy-jury${number}@example.com`,
    password: randomBytes(15).toString("base64url"),
  }));
  const queries = [];
  for (const judge of judges) {
    const hash = await bcrypt.hash(judge.password, 12);
    queries.push(sql`insert into staff (id, email, password_hash, role) values (${judge.id}, ${judge.email}, ${hash}, 'jury')`);
  }
  for (const team of TEAMS) {
    team.participantId = randomUUID();
    team.submissionId = randomUUID();
    queries.push(sql`
      insert into participants (id, code, full_name, email, phone, enrollment_no, course_year, partner_name, partner_enrollment_no,
                                program, semester, partner_phone, partner_program, partner_semester)
      values (${team.participantId}, ${team.code}, ${team.name}, ${team.email}, ${team.phone}, ${team.enrollment},
              'Dummy entry', ${team.partner ?? null}, ${team.partnerEnrollment},
              ${team.program}, ${team.semester}, ${team.partnerPhone}, ${team.partnerProgram}, ${team.partnerSemester})
    `);
    queries.push(sql`
      insert into submissions (id, participant_id, event_name, tagline, poster_url)
      values (${team.submissionId}, ${team.participantId}, ${team.event}, ${team.tagline}, ${`${POSTER_URL}/${team.file}`})
    `);
  }

  const table = [];
  let previous = null;
  for (const [place, entry] of RANKING.entries()) {
    const team = TEAMS[entry.team];
    const first = entry.tieWithPrevious ? sameTotalLowerFirst(criteria, previous[0]) : pointsFor(criteria, entry.share);
    const second = entry.tieWithPrevious ? sameTotalLowerFirst(criteria, previous[1]) : secondOpinion(criteria, first, place);
    previous = [first, second];
    [first, second].forEach((points, judge) => {
      const scoreId = randomUUID();
      const total = points.reduce((sum, value) => sum + value, 0);
      queries.push(sql`insert into scores (id, submission_id, judge_id, total, notes) values (${scoreId}, ${team.submissionId}, ${judges[judge].id}, ${total}, 'Dummy score')`);
      points.forEach((value, index) => {
        queries.push(sql`insert into score_values (score_id, criterion_id, points) values (${scoreId}, ${criteria[index].id}, ${value})`);
      });
    });
    const totals = [first, second].map((points) => points.reduce((sum, value) => sum + value, 0));
    table.push({
      expected_rank: place + 1,
      code: team.code,
      event: team.event,
      team: team.partner ? `${team.name} & ${team.partner}` : team.name,
      judge1: totals[0],
      judge2: totals[1],
      average: (totals[0] + totals[1]) / 2,
      first_criterion: (first[0] + second[0]) / 2,
    });
  }

  await sql.transaction(queries);

  console.log(`participants: ${TEAMS.length} (${TEAMS.filter((team) => !team.partner).length} individuals, ${TEAMS.filter((team) => team.partner).length} pairs), codes BL-9001 to BL-9012`);
  console.log(`submissions:  ${TEAMS.length}`);
  console.log(`scores:       ${RANKING.length * 2} (2 judges x ${RANKING.length} teams), against the ${criteria.length} current criteria`);
  console.log(`unscored:     ${TEAMS.filter((_, index) => !RANKING.some((entry) => entry.team === index)).map((team) => `${team.code} ${team.event}`).join(", ")}`);
  console.log("\nExpected ranking (ranks 4 and 5 tie on the average; the first criterion decides):");
  console.table(table);
  console.log("Dummy judge logins (shown ONCE, not stored anywhere readable):");
  for (const judge of judges) console.log(`  ${judge.email}   ${judge.password}`);
  console.log("\nTo reveal ranks on /live: in /admin set the phase to Results, then use the Reveal rank panel.");
  console.log("Remove everything again with: npm run db:clear-dummy");
} catch (error) {
  console.error(`Seed error: ${error.message}`);
  process.exitCode = 1;
}
