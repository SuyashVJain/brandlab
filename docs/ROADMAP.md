# ROADMAP.md: BRAND LAB website

Today: Sat 10 Oct 2026. Event: Tue 13 Oct 2026. Four days. Build in this order, ship something usable every day.

## Status
- [x] Hero (3D statue, mountain slice, loader, parallax, logos)
- [ ] Logo background cleanup (in progress)

## Sat 10 Oct (today): foundation + public site
1. Finish logo cleanup and hero polish (mobile check).
2. How it works section (3 steps).
3. Details section (date, venue, rules, timeline, judging). Use CONTENT.md; keep TBDs visible.
4. Neon project: run the SQL in DB_SCHEMA.md, add DATABASE_URL and SESSION_SECRET to .env.local and Vercel, enable Vercel Blob, seed the first admin with a one-time script.
5. Register section + `/api/register`, confirmation screen with participant code.
6. FAQ + footer (5 logos, credits).
7. Deploy to Vercel (preview link) and share with the team to catch text errors.

Done when: a person can open the link on a phone, read everything, and register.

## Sun 11 Oct: event-day core
1. `event_state` + admin login + `/admin` shell with phase controls.
2. `/live` page: waiting screen, realtime keyword reveal with the mountain-slice animation.
3. `/submit` page: event name + poster upload, deadline countdown, replace-before-deadline.
4. Admin: registrations table, search, CSV export, check-in toggle, keyword editor.

Done when: you can run a full fake event with 3 dummy users end to end.

## Mon 12 Oct: judging + hardening
1. Jury scoring page (blind view, 5 criteria sliders, notes) + leaderboard.
2. Results page (winners reveal).
3. Load test `/live` with ~150 simulated connections. Fix slow spots.
4. Mobile pass on every page. Reduced-motion pass. Fix any 3D lag on low-end phones (lower DPR, simpler loader).
5. Full rehearsal with 5-10 real people on their own phones.
6. Buy/point the final domain if wanted. Update the QR on the poster/standee to the final URL. Print a backup QR.
7. Export a backup of the DB and set the admin passwords.

## Tue 13 Oct: event day
- Morning: lock content, reset test data, set phase to `registration` or `live`, check Wi-Fi at the venue, open `/admin` on 2 devices.
- Keep a printed list of participants and a Google Form backup link in case the site fails.
- Reveal keywords -> open submissions -> close -> judging -> results.
- After the event: export everything (CSV + posters ZIP).

## If we run late, cut in this order
1. Results page animation (just show a list).
2. Leaderboard polish (plain table).
3. Check-in toggle.
4. Fancy loader (keep the simple counter).
Never cut: registration, keyword reveal, submission, jury scoring, CSV export.

## Open decisions
- Registration open to other colleges or only SUAS?
- Is there a fee? Prizes? (CONTENT.md)
- Tools and AI rules for participants.
- Exact timings.
- Statue model license/credit.
