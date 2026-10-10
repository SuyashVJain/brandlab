# DESIGN.md: BRAND LAB visual system

Reference: the light poster (off-white paper, black type, blue brush LAB, yellow highlights, Greek statue collage). Every section must feel like the same poster.

## Colors
| Token | Hex | Use |
|---|---|---|
| paper | #EFECE6 | page background (with grain) |
| ink | #0A0A0A | main text, BRAND, torn edges |
| brush-blue | #1F3BFF | LAB, accents, underline strokes |
| highlight-yellow | #FFD21F | highlights, circle, bulb glow, tape strips |
| grey-marble | light warm grey | statue |

Rules: yellow is for emphasis only (a highlighted word, a number, a button underline). Blue is for brush strokes and key words. Never use gradients on text. No purple, no pastel.

## Typography
- Display: heavy condensed grotesque for headings (same as the hero BRAND).
- Tagline and labels: wide-tracked uppercase sans, small size, letter-spacing generous.
- Body: clean geometric sans (same as hero body text).
- Handwritten step numbers (01, 02, 03): marker-style, on a yellow highlight swipe.
- LAB lettering in the hero is final. Do not restyle it, and do not reuse it as a font elsewhere.

## Texture and shapes
- Paper grain overlay on the whole page.
- Torn black paper edges in section corners/transitions.
- Faint blueprint grid lines (very low opacity).
- Yellow highlight swipes behind key words, hand-drawn arrows, crown doodle, dotted grids, small "+" crosshairs.
- Brush-stroke black buttons with a blue brush underline.
- Corners of cards: slightly rough/torn, not rounded-pill.

## Hero (built, reference only)
- 3D bust (david_head.glb) in marble material, yellow circle behind, clouds, bulb, dotted grid, blue and black blocks, all parallax layers.
- Mountain slice: a torn diagonal band across the eyes showing the grayscale mountain photo.
- Loading intro: wireframe/point-cloud statue dissolving into marble with a scan line and 00-100 counter.
- Scroll: camera zooms into the face and the mountain band widens as the transition to the next section.

## Motion rules
- Scroll reveals: 20-40px rise + fade, 0.6-0.9s, ease-out. Stagger children by 0.08s.
- Section titles: highlight swipe animates in behind the key word.
- Hover on buttons: slight skew + underline brush extends.
- Keep it purposeful. No bounce, no spinning logos, no autoplay noise.
- Always provide a reduced-motion fallback (static final state).

## Layout
- Desktop: wide editorial layout, 12-column grid, generous whitespace, big type.
- Mobile first-class: single column, 16px gutters, no horizontal scroll, tap targets >= 44px.
- Top bar logos: IEEE | IEEE SUAS-SB | IEEE Computer Society | IEEE WIE | SUAS (equal height, transparent backgrounds, thin dividers).

## Do not
- Do not introduce a new color, font or card style without asking.
- Do not use stock illustrations or emoji.
- Do not add dark-mode.
