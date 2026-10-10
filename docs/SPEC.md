# SPEC.md: Pages and features

Event: BRAND LAB, Tue 13 Oct 2026, Engineering Block, SUAS. Individual participation (1-2).
Flow of the event: 1) participants receive keywords, 2) create a unique event name from them, 3) design a poster for that event.
Tagline: "Think it. Name it. Brand it."  Side line: "Same words, different worlds."

## Public site (single page, scroll sections)
1. **Hero** (DONE): see DESIGN.md.
2. **How it works**: the 3 steps as animated cards (Receive Keywords, Create a Unique Event Name, Design a Poster) with handwritten 01/02/03.
3. **Details**: date, venue, participation rule, day timeline, rules, judging criteria. Text in CONTENT.md.
4. **Register**: form (see below). Closes automatically when admin sets registration closed.
5. **FAQ**: accordion.
6. **Footer**: all 5 logos, contact, credits (statue model, mountain photo).

## Registration
Fields: full name, email, phone, enrollment number, course/year, participating alone or with a partner (if partner: partner name, partner enrollment number).
- Validate on client and server. Block duplicates by email and enrollment number.
- On success: show a confirmation screen with a unique participant code (e.g. BL-0042). Also show it on a "Check my registration" lookup by email.
- Max 2 people per entry.

## Event-day phases
Controlled by one admin-set value `event_state.phase`:
`closed` -> `registration` -> `live` -> `keywords_revealed` -> `submissions_open` -> `submissions_closed` -> `results`

## Keyword reveal page (`/live`)
- Participant enters their code (or is recognized by email) and waits on a cinematic screen: countdown, statue, paper texture.
- When admin presses "Reveal keywords", **every connected participant sees the same keywords at the same moment** (page polls `/api/event-state` every 3s; admin sets a `reveal_at` time and all clients run a synchronized countdown, see DB_SCHEMA.md).
- Keywords animate in word by word over the mountain-slice effect. Keywords stay visible afterwards in a sticky bar.
- If the page is opened after reveal, show keywords immediately.

## Submission (`/submit`)
- Opens when phase = `submissions_open`. Closes at `submissions_close_at`.
- Participant submits: event name (text, max 60 chars), short tagline (optional), poster file (PNG/JPG/PDF, max 15 MB).
- One submission per participant; allow replace until the deadline.
- Show a live countdown and a clear "Submitted" state.

## Admin / Jury (`/admin`, protected)
Roles: `admin` (full control) and `jury` (view + score only).
- **Dashboard**: registration count, list with search/export CSV, attendance check-in toggle.
- **Event control**: buttons to move phases, a "Reveal keywords" button with confirm, edit keywords, set submission deadline.
- **Submissions**: gallery of posters with event name, participant code (jury sees code only, not name, for blind judging).
- **Scoring**: per-criterion sliders and notes (criteria in CONTENT.md), live leaderboard for admin.
- **Results**: reveal winners page when phase = `results`.

## Non-functional
- Must survive ~100-200 simultaneous users on `/live` (cache `/api/event-state` for 1s at the edge so polling does not hit the database each time).
- Mobile friendly for participants. Admin is desktop-first.
- Rate-limit registration and submission endpoints.
- Back-up plan: admin can export all registrations and submissions as CSV/ZIP.

## Out of scope for now
Payments, certificates, email campaigns, multi-event support.
