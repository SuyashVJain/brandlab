# DB_SCHEMA.md: Neon Postgres schema

Database: **Neon** (serverless Postgres). Neon is only a database, so the other jobs are handled like this:
- Access control: no RLS. The browser never talks to the DB. All DB access happens in Next.js route handlers (server only) using `DATABASE_URL`, and each route checks the caller's role.
- Admin/jury login: own `staff` table + bcrypt password + signed httpOnly session cookie (use `jose`). No third-party auth.
- Poster files: **Vercel Blob** (client upload with a token issued by a server route that checks phase and deadline).
- Live keyword reveal: **polling**, not websockets (see below).

Driver: `@neondatabase/serverless` (HTTP). ORM optional: Drizzle. Keep migrations as plain `.sql` files in `db/migrations/`.

## SQL (migration 001)

```sql
create extension if not exists pgcrypto;

create type event_phase as enum (
  'closed','registration','live','keywords_revealed',
  'submissions_open','submissions_closed','results'
);

-- Event control (single row)
create table event_state (
  id int primary key default 1 check (id = 1),
  phase event_phase not null default 'registration',
  reveal_at timestamptz,              -- when keywords become visible (server time)
  submissions_close_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into event_state (id) values (1);

-- Staff (admins and jury)
create type staff_role as enum ('admin','jury');
create table staff (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,        -- bcrypt
  role staff_role not null,
  created_at timestamptz not null default now()
);

-- Participants (one row per entry; an entry can have a partner)
create table participants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- e.g. BL-0042, generated server side
  full_name text not null,
  email text unique not null,
  phone text not null,
  enrollment_no text unique not null,
  course_year text,
  partner_name text,
  partner_enrollment_no text,
  checked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- Keywords (never sent to the browser before reveal)
create table keywords (
  id serial primary key,
  word text not null,
  position int not null
);

-- Submissions (one per participant)
create table submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid unique not null references participants(id) on delete cascade,
  event_name text not null check (char_length(event_name) <= 60),
  tagline text,
  poster_url text not null,           -- Vercel Blob URL
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scores (one row per judge per submission)
create table scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  judge_id uuid not null references staff(id),
  name_score int not null check (name_score between 0 and 25),
  keyword_score int not null check (keyword_score between 0 and 20),
  design_score int not null check (design_score between 0 and 30),
  clarity_score int not null check (clarity_score between 0 and 15),
  impact_score int not null check (impact_score between 0 and 10),
  total int generated always as
    (name_score + keyword_score + design_score + clarity_score + impact_score) stored,
  notes text,
  created_at timestamptz not null default now(),
  unique (submission_id, judge_id)
);

create index on submissions (submitted_at);
create index on scores (submission_id);
```

## Views
```sql
-- Blind judging: no personal data
create view jury_submissions as
select s.id, p.code, s.event_name, s.tagline, s.poster_url
from submissions s join participants p on p.id = s.participant_id;

create view leaderboard as
select s.id, p.code, s.event_name,
       round(avg(sc.total), 2) as avg_total, count(sc.id) as judge_count
from submissions s
join participants p on p.id = s.participant_id
left join scores sc on sc.submission_id = s.id
group by s.id, p.code, s.event_name;
```

## Server routes (Next.js route handlers)
Public:
- `POST /api/register`: validate (zod), rate-limit by IP, generate code, insert. Return the participant code.
- `POST /api/lookup`: email + code -> participant status.
- `GET /api/event-state`: returns `{ phase, serverTime, revealAt, submissionsCloseAt }`, and `keywords` **only if** `now() >= reveal_at` and phase is `keywords_revealed` or later. Send `Cache-Control: s-maxage=1, stale-while-revalidate=2` so 200 users polling don't hammer Neon.
- `POST /api/submit/token`: check participant, phase = `submissions_open`, before deadline; return a Vercel Blob client-upload token (png, jpg, pdf, max 15 MB).
- `POST /api/submit`: save or replace the submission after upload.

Staff (check session role on every call):
- `POST /api/staff/login`, `POST /api/staff/logout`
- `POST /api/admin/phase`: set phase, `reveal_at`, `submissions_close_at`.
- `GET/POST /api/admin/keywords`
- `GET /api/admin/participants` (+ CSV export), `POST /api/admin/checkin`
- `GET /api/jury/submissions` (blind view), `POST /api/jury/score`
- `GET /api/admin/leaderboard`

## Live keyword reveal (no websockets)
- `/live` polls `/api/event-state` every 3 seconds.
- Admin sets `reveal_at` a few seconds in the future. Clients compute the offset between their clock and `serverTime`, run a synchronized countdown, and play the reveal animation when it hits zero. The server only releases keywords at or after `reveal_at`, so nobody can peek early by inspecting network calls.
- Opening `/live` after the reveal shows the keywords immediately.

## Env vars (.env.local and Vercel)
`DATABASE_URL` (Neon pooled connection string), `SESSION_SECRET` (long random string), `BLOB_READ_WRITE_TOKEN` (Vercel Blob). All server-only, never prefixed with NEXT_PUBLIC.

## Security checklist
- Parameterized queries only.
- bcrypt for staff passwords; seed the first admin by a one-time script, not through a public route.
- Rate-limit `/api/register`, `/api/lookup`, `/api/staff/login`.
- Jury responses never include participant name, email or phone.
