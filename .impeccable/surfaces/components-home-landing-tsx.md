---
version: 1
slug: "components-home-landing-tsx"
primary_target: "components/home-landing.tsx"
related_targets: ["components/home-landing.module.css"]
---

# Home landing (marketing homepage)

Scope: `components/home-landing.tsx` + `components/home-landing.module.css`, rendered at `/`
for signed-out visitors only. Visitor mode: **Persuade**.

Audience: institutions (RTO/college owners, directors, academic and ops staff) and partners
(agents who refer students). Job: decide whether to move student management onto EdTrack ONE.
Action: explore the live demo first, book a demo as the strong secondary. Proof on hand: three
real customers with signed testimonials, the working demo. No metrics exist — none may be invented.

## Direction contract

**THESIS.** One room holds the whole institution. EdTrack's claim is that enrolment, learning,
assessment, fees and compliance live in one connected workspace, so the page is a single
furnished isometric room rather than four feature boxes arguing the competitor's case. It refuses
the category default — centred headline over a floating dashboard screenshot with three icon
cards — and refuses the Swiss-editorial slab the previous two attempts reached for.

**OWN-WORLD.** A minihompy room: pastel wallpaper and tiled floor in an isometric frame,
sticker-like furnishings with soft dark outlines and one soft settle when they land. Powder-lilac
paper ground, mint and blush wall panels, EdTrack royal blue, vermilion and golden yellow carried
by the furnishings themselves so the brand lives in the objects. Rounded panels with hairline
borders and generous radii, compact rounded labels, M PLUS Rounded 1c throughout with Jua for the
display line. Recognisable with all content removed by the isometric room, the pastel tiles and
the rounded panel chrome.

**STORY.** The visitor sees an institution's whole workspace as one furnished room, understands
that every part they are currently buying separately is already in here together, believes it
because they can click any furnishing and see what it does and who it serves, and goes in to look
around via the demo.

**FIRST VIEWPORT.** The room owns the centre at full bleed, floor tiles and two wallpapered walls,
furnished with the six parts of the platform. A rounded title panel sits upper-left with the
display line, one sentence, and two sticker buttons — "Come in and look around" (primary, to the
demo) and "Book a demo". A furnishing rail sits under the room naming the parts. A stacked rail
on the right carries the guest ledger: the three real customers signing what the room did for them.
The primary action sits in the title panel, above the fold, left.

**FORM.** Minihompy room (`cyworld-minihompy-room`), user-chosen over the roll's assignment; it
placed seventh on my grounded list and I had declined it, so the build owes it full commitment
rather than a hedge. Seed key `fedacacc`. Code-led: no image generation on this machine, so the
room is authored as real SVG with genuine furnishing state, which is the world's own web leverage
rather than a picture of it.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Newsletter signup has no provider wired; either drop it or point it at Resend before launch.
- "Resources" and "Company" nav destinations do not exist as pages yet.
