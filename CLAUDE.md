# BRAND LAB: Project Context for Claude Code

Event website for **BRAND LAB**, an IEEE SUAS-SB creative challenge (Tue 13 Oct 2026, Engineering Block, Symbiosis University of Applied Sciences, Indore). Participants receive keywords, create a unique event name, and design a poster. Individual participation (1-2 people).

Read these before building anything:
- `DESIGN.md`: look, colors, motion rules
- `SPEC.md`: pages, features, user flows
- `CONTENT.md`: all real text (some items still TBD)
- `DB_SCHEMA.md`: Neon tables, server routes, and the polling-based reveal
- `ROADMAP.md`: what to build and in which order

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- 3D: three, @react-three/fiber, @react-three/drei
- Animation: GSAP + ScrollTrigger
- Database: Neon Postgres (`@neondatabase/serverless`), accessed only from server route handlers
- Auth: own staff table + bcrypt + signed cookie (jose). No third-party auth.
- File uploads: Vercel Blob
- Live reveal: polling `/api/event-state` (no websockets)
- Hosting: Vercel

## Folder rules
- `assets/` = raw source files from me. Never edit or delete them.
- `public/` = files the site actually serves (`models/`, `textures/`, `logos/`).
- Components in `components/`, one folder per section (e.g. `components/hero`, `components/details`).
- Keep shader code in its own commented file.

## Working rules
- **Never add `Co-Authored-By: Claude` or `Generated with Claude Code` to any git commit, in any repo, ever.**
- Do only what the prompt asks. Do not touch other sections, restyle, or rename things on your own.
- Do not change the hero LAB lettering. It is approved as is.
- Keep the 3D scene at 60fps. Mobile: lower DPR, no mouse tilt.
- Respect `prefers-reduced-motion`.
- Handle missing assets gracefully (fallbacks, never a blank crash).
- Secrets only in `.env.local`. Never commit them. `DATABASE_URL` and other secrets are server-only, never NEXT_PUBLIC.
- When done: run `npm run dev`, and tell me in 2-3 lines what changed.

## Communication style (me)
- Short, direct answers.
- One question or point at a time.
- If a command must be run, give one command at a time.

## Credits to keep in the footer
- 3D model 'David Head' by 1d_inc (https://sketchfab.com/1d_inc), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://skfb.ly/oKvzW. Modified: material and shader effects applied.
- Mountain photo by Pietro Dona on Unsplash.
