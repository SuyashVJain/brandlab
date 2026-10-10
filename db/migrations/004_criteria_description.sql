-- 004_criteria_description.sql
-- An optional one-line description for each judging criterion (edited in /admin,
-- shown to judges and in the home page Judging panel).

alter table criteria
  add column description text check (char_length(description) <= 160);
