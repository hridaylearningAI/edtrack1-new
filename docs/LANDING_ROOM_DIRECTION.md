# EdTrack — connected institution room

Research and implementation brief, 13 October 2026.

## Agreed brief

The homepage explains how EdTrack replaces disconnected institutional systems with one connected platform. Institution owners are the primary audience; administrators are secondary. The primary action is **Explore demo**, followed by a sales conversation.

Keep the whole experience inside a scroll-driven room. Main modules take priority over add-ons. The preferred direction is a realistic 3D workspace, actual product previews within that room, and a subtle guide. Keep previews modular so they can later expand into full-screen demonstrations without rebuilding the narrative. Preserve the final ceiling reveal with the supplied EdTrack logo.

## Reference shortlist

These are sources of design principles, not templates to reproduce or sources of assets.

| Reference | Useful principle | Application to EdTrack |
| --- | --- | --- |
| [Apple — AirPods Pro](https://www.apple.com/airpods-pro/) | Large, carefully lit product imagery; focused feature chapters; close-up detail views. | One clear benefit and one readable software view per station. Give people time to understand each reveal. |
| [Lusion](https://lusion.co/) | Deliberate 3D material treatment, composition, and interactive visual storytelling. | Give the room consistent lighting, convincing surfaces, depth, and a restrained camera path. |
| [Bruno Simon](https://bruno-simon.com/) | A spatial-world reference for exploration and environmental navigation. | Keep the room understandable as a place, with navigable floor space and meaningful destinations. Current live browser inspection returned a blank canvas, so this is a secondary reference, not a verified performance benchmark. |

Apple and Lusion were visually inspected in the browser. Apple media playback was unavailable for some sections; the recommendation draws on its visible composition and feature hierarchy rather than a claim that every animation was verified.

## Current implementation findings

- The room is an SVG illustration, while the guide is a separate Three.js canvas embedded in it. They do not share a camera or depth buffer. Conditional SVG masks approximate occlusion.
- Block furniture, patterned pastel walls, a checkerboard floor, and rounded display typography give the scene a toy-like character.
- Active furniture translates upward, weakening the feeling that objects rest on the floor.
- Screen and status details are too small to explain the software. The homepage currently offers no substantial product demonstration inside the room.
- The narrative follows one learner. Owners need a clearer explanation of how teams, records, learning, and finance work together.
- Equal chapter durations contain unequal walking distances. Camera, CSS position changes, character pose, and masking use different mechanisms.
- Mobile disables some camera transforms and accumulates layout overrides. It needs an intentional composition of its own.

## Creative direction

**Working concept: Your institution, working together.**

A contemporary institutional workspace, presented as a cutaway interior. Warm white architectural surfaces, oak worktops, brushed metal, soft daylight, and restrained blue, red, and green accents. Furnishings should have believable proportions and rounded edges where appropriate. Apple influence belongs in the precision of materials, spacing, typography, and controls.

Keep a clear central aisle. Arrange stations around its perimeter, allowing every guide movement to follow the floor. Screens belong to real objects: a reception monitor, learning workstation, finance display, portal wall, and records shelf. A shared architectural light line can make connections visible when information moves between modules.

The guide wears understated clothing and remains secondary to the product. At each stop it makes a small, grounded action: turns toward a monitor, taps a control, opens a drawer, or gestures toward a display. Objects stay grounded. The camera moves with purpose and settles before detailed product content appears.

## Scroll storyboard

| Chapter | Owner's question | Room action and product evidence | Connection made visible |
| --- | --- | --- | --- |
| Arrival | Why do we need so many systems? | Establish the entire workspace. Headline: “Your whole institution. Finally connected.” Demo is immediately available. | Name the main stations and show they share one environment. |
| Student management | Where is the reliable student record? | Guide visits reception. Reveal a real, sanitised demo view of records and enrolment. | The same sample enrolment becomes available at the learning station. |
| Learning & assessments | Can our team see learning and progress together? | Learning screen activates. Show an actual course/activity view and relevant progress information. | Completion and assessment status carry forward without presenting another isolated tool. |
| Fees & reporting | Can I see what needs attention? | Guide stops beside the management display. Show actual fee and reporting capabilities supported by the product. | Relate fees and progress to the same sample record. Label sample data clearly. |
| Portals & communication | Can each team work from the same information? | Wall displays reveal role-specific portal views. Guide stays in the aisle. | Demonstrate shared information with appropriate role access; avoid implying identical permissions. |
| Records & completion | How do we keep evidence and outcomes organised? | Open a records drawer and reveal the relevant record/certificate workflow. | Tie the outcome back to the original enrolment. Avoid unsupported compliance guarantees. |
| One connected system | What changes when it all works together? | Camera pulls back. Briefly illuminate the completed connections, then reveal the ceiling and EdTrack logo. | Summarise the complete system. Explore demo first; sales conversation second. |

Each station follows the same understandable rhythm: approach → settle → interaction → readable product evidence → handoff. Scrolling backwards must reverse the state cleanly. Do not start overlapping decorative animations while someone is reading.

## Product preview and asset requirements

- Capture actual demo screens with sample data. Use focused crops that remain legible, with a clear “Demo data” label where necessary.
- Do not substitute invented dashboards, fabricated revenue, customer counts, or satisfaction statistics for product proof.
- Use independently created or appropriately licensed 3D assets. Reference-site assets and screenshot crops are not implementation assets.
- Prefer a coherent furnished room asset with optimised textures over many unrelated stock models.
- The guide needs a properly rigged model and a walk cycle with planted feet. Stop animations must align with the room's furniture heights and positions.
- Use the supplied `/images/EdTrack1 logo.png` for the brand reveal.
- Confirm the real sales destination before wiring that action; do not invent an email address or booking URL.

## Implementation structure

1. Put the room, furniture, guide, lights, shadows, and camera in **one Three.js scene**. This provides consistent projection and natural object occlusion.
2. Define stations, walking paths, camera targets, preview content, and interactions as chapter data. Maintain a single scroll progress source for scene state.
3. Keep headings, benefit copy, navigation, and large product previews as accessible HTML. Anchor previews to scene destinations; expand them enough to read without requiring tiny texture text.
4. Derive guide position and joint pose from progress. Walking time should reflect distance, with stable arrival and reading intervals. Avoid frame-dependent rotation smoothing.
5. Keep a constant scene scale and light direction. Use restrained camera travel rather than repeatedly scaling and shifting the entire room with unrelated CSS.
6. Preserve signed-in routing and existing authentication behavior in `app/page.tsx`.

## Responsive and quality requirements

- Desktop: room remains the main stage, with clear readable copy and focused previews.
- Mobile: reframe each station around a smaller camera path and a full-width readable preview. Keep previous/next controls and a direct route to demo.
- Reduced motion: provide the same chapters and product evidence through static station states and explicit navigation.
- WebGL unavailable: show a designed static room overview with accessible module content and demo access.
- No guide/furniture intersections, floating feet, clipping through walls, or interaction targets outside reach.
- Test rapid scroll, reverse scroll, chapter jumps, resize, short viewports, and arrival/end states.
- Avoid an always-running render loop when the scene is idle. Cap rendering resolution and optimise geometry/textures for mobile.
- Narrative acceptance: after the tour, an owner can explain which modules exist, how information connects, and where to try the product.

## Recommended first build milestone

Build the complete room composition and the first two connected stations to final visual quality, including their real product previews, guide movement, reverse scrolling, mobile framing, and fallback states. Use this vertical slice to validate the direction before extending the remaining stations with the same visual and motion system.

## Build delivered — 13 October 2026

The homepage now uses `home-room-scene.tsx`: an original procedural Three.js interior with rounded furniture, oak grain, window framing, slatted wall, desk details, shared floor inlay, and a final logo ceiling. The custom articulated guide shares the scene, camera, lighting, and depth buffer. Its scroll-derived walk, departure/arrival turns, pointing gesture, and records drawer interaction reverse with the tour.

`home-room-story.ts` owns the seven chapters and guide route. `home-landing.tsx` supplies the accessible HTML narrative, GSAP scroll progress, chapter controls, and expandable actual demo captures. The learning and fees captures are of the existing demo module previews; student and certificate captures show existing sample-data admin views. They are labelled as sample data. These captures are static, with `/demo` providing the interactive product.

Verified: desktop and 390px mobile layouts (844px and 667px tall), chapter navigation, product preview dialog and Escape dismissal, roof reveal, focused TypeScript compile, and 6,951 path samples against conservative furniture footprints. Full-project TypeScript checking reports errors outside the changed homepage components. Reduced-motion/static chapters and WebGL image fallback are implemented; hardware/context-loss behavior still needs device testing.

The guide is a custom mesh rig, rather than a motion-captured human asset. A verified sales booking destination is still needed for the secondary sales action. Authentication and signed-in role routing were not changed.

## First-person tour refinement — 13 October 2026

The visitor now takes the guide's perspective. Scroll enters from the architectural overview, fades the guide during entry, and moves at a steady eye height along the clear aisle. Each station has an approach interval followed by a settled reading interval. The five physical monitors display actual product captures; the floating preview cards have been removed. Clicking a monitor or the accessible “Open this screen” button opens the larger HTML preview. These remain static sample-data captures, with the interactive platform available through `/demo`.

The records station now has a dedicated display. Camera positions and shortest-angle turns derive directly from scroll progress, so reverse scrolling retraces the same journey. The camera leaves the room before the ceiling descends. Mobile uses its own framing and compact previous/next navigation; reduced motion retains explicit static chapter navigation.

Verified the first-person views on desktop and at 390 × 844 and 390 × 667, monitor click, Escape dismissal, chapter jumps, final ceiling, focused TypeScript compilation and diff whitespace checks. The camera check covers 6,951 poses, furniture clearance, continuity, all five settled views, stable interior eye height and ceiling timing. Resize/font changes refresh the scroll range. Rendering remains demand-driven. Hardware/context-loss testing and the existing unrelated full-project TypeScript errors remain outside this verification.

## Guided display workspaces — 13 October 2026

Each physical display and its HTML button now opens a guided sample-data workspace, replacing the image-only dialog. Five tasks follow Leah Chen (STU-1045): review enrolment, complete one example learning activity, review an invoice, switch to the student perspective, and review connected evidence. A single React state held by the homepage supplies every workspace, including activity completion in the portal and records view. Module navigation and task counts remain available inside the panel. State survives closing/reopening during the visit and resets on reload.

These are frontend sandbox components using existing Button/Input controls, not authenticated production pages. No APIs, real payments, certificate issuance or live records are involved. Existing physical monitor images remain the entry preview. Opening the panel pauses scene updates and locks background scrolling; dismissal restores room access, while task completion offers continuation to the next station. The native dialog supplies modal focus containment and Escape dismissal. Entry uses a scoped GSAP transition and respects reduced motion.

Verified all five tasks through the browser, including 5/5 completion, cross-module activity propagation, persistence after closing/reopening, Escape, and continuation to the final room chapter. At 390 × 844, verified the unfinished-records path into learning, activity completion, student portal reflection and unchanged background scroll position. Focused TypeScript, camera checks and diff whitespace validation pass. Proof images are saved under `artifacts/landing-room/guided-workspace-*.jpg`.

## Below-tour platform details — 13 October 2026

Added `home-platform-details.tsx` after the sticky walkthrough. Restored the missing education audiences, three solution areas, learner workflow, all three existing customer testimonials and logos, FAQs, demo/account creation actions, and footer navigation. Content comes from the user-provided full-page screenshot and matching repository source at `98a5470`; the supplied Vercel preview redirects to login and was not accessible for live content comparison. Customer quotations are preserved without adding new adoption counts or outcome claims. FAQ copy distinguishes the no-login guided sandbox from the full authenticated demo.

The continuation uses the room's warm paper, typography and restrained brand accents. The final chapter links to “Keep exploring”; a keyboard skip link also bypasses the long walkthrough. The room's scroll trigger remains scoped to its existing tour section. Verified desktop and 390 × 844 mobile rendering, no horizontal overflow, loaded logos, section anchors, FAQ expansion, focused TypeScript compilation and existing camera/path checks. Screenshots are in `artifacts/landing-room/platform-details-*.jpg`.
