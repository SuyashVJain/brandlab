-- 003_criteria.sql
-- Judging criteria become data (editable from /admin) instead of five fixed columns.

create table criteria (
  id serial primary key,
  position int not null,
  label text not null,
  max_points int not null check (max_points between 1 and 100)
);

insert into criteria (position, label, max_points) values
  (1, 'Creativity and originality of the event name', 25),
  (2, 'Link between keywords and the idea', 20),
  (3, 'Poster visual design and composition', 30),
  (4, 'Clarity, typography and readability', 15),
  (5, 'Overall impact and brand feel', 10);

-- One row per judge's score per criterion.
create table score_values (
  score_id uuid references scores(id) on delete cascade,
  criterion_id int references criteria(id),
  points int not null check (points >= 0),
  primary key (score_id, criterion_id)
);

-- Backfill: copy the five old columns of every existing score, so nothing is lost.
insert into score_values (score_id, criterion_id, points)
select s.id, c.id,
       case c.position
         when 1 then s.name_score
         when 2 then s.keyword_score
         when 3 then s.design_score
         when 4 then s.clarity_score
         when 5 then s.impact_score
       end
from scores s
cross join criteria c;

-- scores.total: from a generated column to a plain stored one, kept up to date by the API.
-- (Existing values are preserved by DROP EXPRESSION.)
alter table scores alter column total drop expression;
alter table scores alter column total set default 0;
alter table scores alter column total set not null;

-- The five old columns stay, but are no longer used: no range checks, nullable.
alter table scores
  drop constraint if exists scores_name_score_check,
  drop constraint if exists scores_keyword_score_check,
  drop constraint if exists scores_design_score_check,
  drop constraint if exists scores_clarity_score_check,
  drop constraint if exists scores_impact_score_check;

alter table scores
  alter column name_score drop not null,
  alter column keyword_score drop not null,
  alter column design_score drop not null,
  alter column clarity_score drop not null,
  alter column impact_score drop not null;

-- Same leaderboard as before; avg_total reads the (now plain) total column.
create or replace view leaderboard as
select s.id, p.code, s.event_name,
       round(avg(sc.total), 2) as avg_total, count(sc.id) as judge_count
from submissions s
join participants p on p.id = s.participant_id
left join scores sc on sc.submission_id = s.id
group by s.id, p.code, s.event_name;
