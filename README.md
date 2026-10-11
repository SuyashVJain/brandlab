<p align="center">
  <img src="docs/screenshots/home-hero.png" alt="BRAND LAB home page: a marble statue with a torn strip of mountain photo across its eyes, between the words BRAND and LAB" width="100%">
</p>

<h1 align="center">BRAND LAB</h1>

<p align="center">
  <strong>Think it. Name it. Brand it.</strong><br>
  The event website for an IEEE SUAS-SB creative challenge: registration, a live keyword reveal, poster submissions, blind jury scoring and an on-stage rank reveal.
</p>

<p align="center">
  <a href="https://brandlab-ieee.vercel.app/"><img alt="Live site" src="https://img.shields.io/badge/live-brandlab--ieee.vercel.app-0A0A0A?style=flat-square"></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-0A0A0A?style=flat-square&logo=nextdotjs&logoColor=white">
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-1F3BFF?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-1F3BFF?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="Neon Postgres" src="https://img.shields.io/badge/Neon-Postgres-FFD21F?style=flat-square&labelColor=0A0A0A">
  <img alt="Deployed on Vercel" src="https://img.shields.io/badge/Vercel-deployed-0A0A0A?style=flat-square&logo=vercel&logoColor=white">
  <a href="LICENSE"><img alt="Licence: MIT" src="https://img.shields.io/badge/licence-MIT-EFECE6?style=flat-square&labelColor=0A0A0A"></a>
</p>

<p align="center">
  <a href="https://brandlab-ieee.vercel.app/"><strong>brandlab-ieee.vercel.app</strong></a>
</p>

## Contents

- [The event](#the-event)
- [Feature tour](#feature-tour)
- [Event phases](#event-phases)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Design system](#design-system)
- [Security and fairness](#security-and-fairness)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Credits and licences](#credits-and-licences)
- [Author](#author)

## The event

**BRAND LAB** is a creative challenge run by the IEEE SUAS Student Branch, with the IEEE Computer Society and IEEE WIE affinity groups.

| | |
|---|---|
| Date | Tuesday, 13 October 2026 |
| Venue | Engineering Block, Symbiosis University of Applied Sciences (SUAS), Indore |
| Who | SUAS students, as an individual or a pair |
| Fee | Free |

How it works:

1. **Receive keywords.** Everyone gets the same set of keywords at the same moment.
2. **Create a unique event name.** Turn the keywords into an event name nobody else will think of.
3. **Design a poster.** Build the identity for that event as a poster and submit it before the deadline.

Same words, different worlds.

## Feature tour

Every screenshot below was taken from a local run with the removable dummy data (see [Scripts](#scripts)). The keywords shown are samples.

### Public site

A single page: a 3D hero, how the challenge works, the details and rules, the judging criteria, FAQ and footer.

| How it works | Details and rules |
|---|---|
| ![How it works section](docs/screenshots/home-how-it-works.png) | ![Details section](docs/screenshots/home-details.png) |

| Judging criteria | FAQ |
|---|---|
| ![Judging panel: one stacked bar out of 100 points](docs/screenshots/home-judging.png) | ![FAQ section](docs/screenshots/home-faq.png) |

The judging bar is drawn from the live criteria, so it always matches what the jury scores against.

![Footer with organiser logos and contacts](docs/screenshots/home-footer.png)

### Registration

Individuals or pairs register with their programme and semester and receive a participant code (for example `BL-0042`). The same validation runs in the browser and on the server.

| Individual | Pair |
|---|---|
| ![Registration form for an individual](docs/screenshots/register-individual.png) | ![Registration form with the partner section](docs/screenshots/register-pair.png) |

<p align="center">
  <img src="docs/screenshots/register-individual-mobile.png" alt="Registration form on a phone" width="280">
  &nbsp;&nbsp;
  <img src="docs/screenshots/register-pair-mobile.png" alt="Partner section of the registration form on a phone" width="280">
</p>

### Live stage: countdown and keyword reveal

`/live` is the screen projected in the hall. It polls the server about every four seconds, counts down on the server clock, and shows the keywords to every device at the same moment.

| Stand by | Countdown |
|---|---|
| ![Live stage waiting for the event to start](docs/screenshots/live-standby.png) | ![Countdown over the statue](docs/screenshots/live-countdown.png) |

![Keywords revealed on a torn strip of mountain photo](docs/screenshots/live-keywords.png)

Phones get a lighter version of the same screen, without the 3D scene.

### Submissions

Participants unlock the form with their email and code, then upload a poster (PNG, JPG or PDF) with an event name and tagline. Uploads go straight from the browser to Vercel Blob.

![Submission page](docs/screenshots/submit.png)

### Blind jury scoring

Judges see the participant code, event name and poster only: never a name, email or phone number. Each criterion has its own slider and the total is out of 100.

<p align="center">
  <img src="docs/screenshots/jury-list.png" alt="Jury list of entries on a phone" width="280">
  &nbsp;&nbsp;
  <img src="docs/screenshots/jury-scoring.png" alt="Jury scoring form on a phone" width="280">
</p>

### Admin console

| Tab | What it does |
|---|---|
| Event control | Move between phases, edit keywords, start the reveal, set the submission deadline, reveal a rank on `/live` |
| Registrations | Search, filter, check in by code, export CSV |
| Criteria | Edit the judging criteria and their points (always totalling 100); locked once scoring starts |
| Leaderboard | Average of the judges' totals, with every judge's points per criterion |
| Staff | Manage the judge and admin accounts |

| Event control | Registrations and check-in |
|---|---|
| ![Admin event control](docs/screenshots/admin-event-control.png) | ![Admin registrations with dummy participants](docs/screenshots/admin-registrations.png) |

| Criteria | Leaderboard |
|---|---|
| ![Admin criteria editor](docs/screenshots/admin-criteria.png) | ![Admin leaderboard with dummy teams](docs/screenshots/admin-leaderboard.png) |

### Rank reveal on the live stage

In the results phase an admin picks a rank, previews who holds it, and reveals it on `/live`. Every open screen plays the reveal within a few seconds. Rank 1 gets the full treatment; ranks 2 and 3 a medium one; the rest a short, calm one.

![Reveal rank panel in the admin console](docs/screenshots/admin-reveal-rank.png)

| Rank 3 | Rank 1 |
|---|---|
| ![Rank 3 revealed on the live stage](docs/screenshots/live-rank-3.png) | ![Rank 1 revealed on the live stage](docs/screenshots/live-rank-1.png) |

![Rank 1 at the moment the numeral lands, with paper confetti](docs/screenshots/live-rank-1-burst.png)

## Event phases

One row in the database holds the current phase. An admin moves it forward (or back) from the Event control tab.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> closed
    closed --> registration: open sign-ups
    registration --> live: event day
    live --> keywords_revealed: reveal keywords
    keywords_revealed --> submissions_open: open uploads
    submissions_open --> submissions_closed: deadline
    submissions_closed --> results: judging done
    results --> [*]
```

| Phase | What the public sees |
|---|---|
| `closed` | The site, with registration closed |
| `registration` | The registration form is open |
| `live` | `/live` shows "Stand by" |
| `keywords_revealed` | Countdown, then the keywords |
| `submissions_open` | Keywords, plus the link to submit a poster |
| `submissions_closed` | Keywords, submissions closed; judges score |
| `results` | Ranks are revealed one at a time on `/live` |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        P[Public pages]
        L[Live stage]
        A[Admin and jury console]
    end

    subgraph Vercel
        N[Next.js App Router]
        R[API route handlers]
    end

    D[(Neon Postgres)]
    B[(Vercel Blob)]

    P --> N
    A --> N
    L -- polls /api/event-state every 4 s --> R
    P -- register, verify, submit --> R
    A -- signed session cookie --> R
    R --> D
    P -- poster upload with a short-lived token --> B
    R -- issues upload tokens, checks files --> B
```

- The database is reached only from server route handlers. No database credentials or queries ever run in the browser.
- The live reveal uses plain polling, not websockets: it works on campus Wi-Fi and behind any proxy.
- Countdowns run on the server clock, so every screen reaches zero together.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4 plus hand-written section stylesheets |
| 3D | three.js, @react-three/fiber, @react-three/drei, a custom shader for the mountain slice |
| Animation | GSAP and ScrollTrigger |
| Database | Neon Postgres through `@neondatabase/serverless` |
| Validation | zod, shared by the forms and the API |
| Auth | Own staff table, bcrypt password hashes, signed session cookie (jose) |
| File uploads | Vercel Blob (client uploads) |
| Hosting | Vercel |

## Design system

The look comes from the event poster: cut paper, marker ink and one loud yellow.

| Token | Value | Used for |
|---|---|---|
| Paper | `#EFECE6` | Backgrounds |
| Ink | `#0A0A0A` | Text, solid buttons |
| Brush blue | `#1F3BFF` | The LAB lettering, links, accents |
| Yellow | `#FFD21F` | Highlights and emphasis |

| Role | Typeface |
|---|---|
| Display | Anton |
| Brush lettering | Permanent Marker |
| Body | Montserrat |

- Panels are torn-paper shapes generated from a seed, so the server and the browser draw the same edge.
- No gradients on text, no dark mode, no bounce easing.
- `prefers-reduced-motion` is respected everywhere; phones skip the 3D scene on `/live`.

The full rules are in [docs/DESIGN.md](docs/DESIGN.md).

## Security and fairness

| Concern | How it is handled |
|---|---|
| Staff passwords | Stored only as bcrypt hashes |
| Sessions | A signed, HTTP-only cookie; the role is re-read from the database on every request |
| Cross-site requests | State-changing staff routes check the request origin |
| Abuse | Per-IP rate limiting on the public routes, generous enough for a shared campus network |
| Keywords | Never sent to any browser before the reveal time; the check is made inside the database query, on the database clock |
| Blind judging | The jury API returns the code, event name and poster only |
| Results | The public API returns only the single rank that is currently revealed: no scores, no other ranks |
| Secrets | Server-only environment variables; nothing secret is exposed as `NEXT_PUBLIC` |

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Neon Postgres database
- A Vercel Blob store (for poster uploads)

### Setup

```bash
git clone https://github.com/SuyashVJain/brandlab.git
cd brandlab
npm install
```

Create `.env.local` in the project root with these variables. Never commit this file.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Connection string of the Neon database |
| `SESSION_SECRET` | A long random string used to sign the staff session cookie |
| `BLOB_READ_WRITE_TOKEN` | Read/write token of the Vercel Blob store |

Create the tables:

```bash
npm run db:migrate
```

Create the first admin. The email and password are passed on the command line and are never written to a file:

```bash
ADMIN_EMAIL=<your-email> ADMIN_PASSWORD=<your-password> npm run db:seed-admin
```

On PowerShell, set `$env:ADMIN_EMAIL` and `$env:ADMIN_PASSWORD` first, then run `npm run db:seed-admin`.

Start the site:

```bash
npm run dev
```

Open `http://localhost:3000`, and sign in at `/admin/login`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply every new file in `db/migrations/`. Safe to run again |
| `npm run db:seed-admin` | Create the first admin, or reset a staff password |
| `npm run db:seed-dummy` | Add 12 dummy teams with posters, two dummy judges and scores, to try the whole flow |
| `npm run db:clear-dummy` | Remove exactly that dummy data again |

> **Before the real event, run `npm run db:clear-dummy`.** Dummy teams would otherwise show up in the registrations list, the jury view, the leaderboard and the public results.

All database commands act on the database named by `DATABASE_URL`. Check which database that is before you run anything.

## Project structure

```text
app/
  page.tsx              home page
  register/ live/ submit/ admin/
  api/                  route handlers (public, jury, admin)
  icon.svg, manifest.ts, opengraph-image.png
components/
  Hero.tsx, StatueScene.tsx, shaders/     3D hero
  how-it-works/ details/ faq/ footer/     home page sections
  register/ submit/ live/ admin/          feature screens
  shared/                                 torn-paper panels, scroll reveals
lib/                    schemas, auth, ranking, rate limiting, site content
db/migrations/          numbered SQL migrations
scripts/                migrate, seed and clear scripts
docs/                   design, spec, content, schema, runbook, screenshots
public/                 models, textures, logos, icons
```

All editable site text lives in [`lib/site-content.ts`](lib/site-content.ts).

## Deployment

The site is deployed on Vercel.

1. Import the repository into Vercel.
2. Add the environment variables from [Getting started](#getting-started) to the project.
3. Run `npm run db:migrate` against the production database before deploying code that needs a new migration.
4. Deploy.

## Documentation

| Document | Contents |
|---|---|
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Commands for running the event, and the dummy data |
| [docs/DESIGN.md](docs/DESIGN.md) | Look, colours and motion rules |
| [docs/SPEC.md](docs/SPEC.md) | Pages, features and user flows |
| [docs/CONTENT.md](docs/CONTENT.md) | The real text of the site |
| [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) | Tables and server routes |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Build order |

## Credits and licences

| Item | Credit |
|---|---|
| Statue | 3D model 'David Head' by 1d_inc ([sketchfab.com/1d_inc](https://sketchfab.com/1d_inc)), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: [skfb.ly/oKvzW](https://skfb.ly/oKvzW). Modified. |
| Mountain photo | Pietro Dona on Unsplash (Unsplash License) |
| Fonts | Anton, Permanent Marker and Montserrat, from Google Fonts under their own open licences |
| Logos | The IEEE, IEEE Computer Society, IEEE WIE and SUAS names and logos belong to their respective owners and are used here to identify the organisers |

The source code of this project is released under the [MIT License](LICENSE), copyright 2026 Suyash Vasal Jain, IEEE SUAS-SB.

The MIT licence does **not** cover the third-party items in the table above: the statue model (CC BY 4.0, attribution required), the mountain photo (Unsplash License), the fonts (their own open licences), and the IEEE, IEEE Computer Society, IEEE WIE and SUAS names and logos, which remain the property of their owners.

## Author

**Suyash Vasal Jain**, IEEE SUAS-SB.
