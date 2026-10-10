-- 006_revealed_rank.sql
-- The rank currently revealed on /live (set by an admin in the results phase). 0 = nothing shown.
-- reveal_nonce goes up by one on every save, so revealing the same rank again replays the reveal.

alter table event_state
  add column revealed_rank int not null default 0 check (revealed_rank between 0 and 200),
  add column reveal_nonce bigint not null default 0;
