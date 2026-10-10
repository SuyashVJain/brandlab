-- 002_participant_code_seq.sql
-- Source of the participant codes: BL-0001, BL-0002, ...
-- /api/register formats nextval() as 'BL-' || lpad(n, 4, '0').

create sequence participant_code_seq start with 1 increment by 1;
