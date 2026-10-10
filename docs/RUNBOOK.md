# RUNBOOK.md: commands for running BRAND LAB

All of these act on the database named by `DATABASE_URL` in `.env.local`. Check which database that is before you run anything.

## Database

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies every new file in `db/migrations/`. Safe to run again. Run it against production before deploying code that needs a new migration. |
| `npm run db:seed-admin` | Creates the first admin, or resets a staff password. Needs `ADMIN_EMAIL` and `ADMIN_PASSWORD` set on the command line. |

## Dummy data (for trying the whole flow)

| Command | What it does |
|---|---|
| `npm run db:seed-dummy` | Adds 12 dummy teams (8 individuals, 4 pairs) with submissions and generated posters, two dummy judges, and scores for 10 of the 12 teams. |
| `npm run db:clear-dummy` | Removes exactly that dummy data again. Safe to run twice. |

**Before the real event, run `npm run db:clear-dummy`.** Dummy teams would otherwise show up in the registrations list, the jury view, the leaderboard and the public results.

What the dummy data looks like, so you can recognise it:

- Participants: emails `dummy-01@example.com` to `dummy-12@example.com`, codes `BL-9001` to `BL-9012`, course "Dummy entry". The real code counter is not touched, so real registrations still start at `BL-0001`.
- Judges: `dummy-jury1@example.com` and `dummy-jury2@example.com`. Their passwords are random and printed once when you seed; to get new ones, clear and seed again.
- Posters: PNG files in `public/dummy-posters/`. That folder is in `.gitignore`, so the posters are never committed or deployed; they only show on the machine where you seeded. Nothing is uploaded to Vercel Blob.
- Ranking: the 4th and 5th teams tie on the average on purpose, to exercise the tie-break (the higher score on the first criterion wins).

`db:seed-dummy` refuses to run when real participants, submissions or scores exist. To seed next to real data anyway: `npm run db:seed-dummy -- --force`.

To reveal the dummy ranks: open `/live` on a desktop screen, then in `/admin` set the phase to **Results** and use the **Reveal rank** panel (Event control tab).
