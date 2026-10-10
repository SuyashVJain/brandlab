-- 007_registration_fields.sql
-- Programme, semester and the partner's phone on every registration.
-- All nullable here so the rows registered before this migration survive;
-- the API requires them for every new registration (lists in lib/site-content.ts).

alter table participants
  add column program text,
  add column semester smallint check (semester between 1 and 8),
  add column partner_phone text,
  add column partner_program text,
  add column partner_semester smallint check (partner_semester between 1 and 8);
