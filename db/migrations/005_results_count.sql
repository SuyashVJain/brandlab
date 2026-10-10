-- 005_results_count.sql
-- How many winners the public results page shows (set by an admin). 0 hides them all.

alter table event_state
  add column results_count int not null default 0 check (results_count between 0 and 200);
