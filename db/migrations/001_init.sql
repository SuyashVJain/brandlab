-- 001_init.sql
-- Exact SQL from docs/DB_SCHEMA.md ("SQL (migration 001)" and "Views").
-- Applied by scripts/migrate.mjs; do not edit after it has run, add a new migration instead.

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

-- Views
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
