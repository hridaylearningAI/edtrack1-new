---
name: EdTrack ONE — approved platform demo
description: Warm editorial institution workspace scoped to /platform and its module previews.
colors:
  paper: "#f5f3ed"
  panel: "#fafaf7"
  ink: "#263432"
  muted: "#646e68"
  line: "#d8dfd2"
  panel-line: "#e2e4da"
  primary: "#263a32"
  primary-hover: "#1d5140"
  blue: "#245ac6"
  blue-soft: "#e6edf7"
  blue-text: "#204b9c"
  green: "#208064"
  green-soft: "#e5eee6"
  sage: "#41755c"
  sage-soft: "#e3e8dc"
  terracotta: "#c44b37"
  attention: "#b34330"
  attention-soft: "#f5e7e0"
  attention-text: "#98412e"
  white: "#fff"
typography:
  display:
    fontFamily: "'Campus Editorial', Georgia, serif"
    fontSize: "53px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  module-title:
    fontFamily: "'Campus Editorial', Georgia, serif"
    fontSize: "43px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  panel-title:
    fontFamily: "'Campus Editorial', Georgia, serif"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "'Campus Editorial', Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  dialog-title:
    fontFamily: "'Campus Editorial', Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Campus Sans', Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.7
  control:
    fontFamily: "'Campus Sans', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  label:
    fontFamily: "'Campus Sans', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  field: "10px"
  panel: "14px"
  action: "15px"
  dialog: "16px"
  pill: "30px"
  navigation: "40px"
spacing:
  step-6: "6px"
  step-8: "8px"
  step-10: "10px"
  step-12: "12px"
  step-14: "14px"
  step-16: "16px"
  step-18: "18px"
  step-20: "20px"
  step-23: "23px"
  step-24: "24px"
  step-28: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.action}"
    padding: "0 23px"
    height: "47px"
    typography: "{typography.control}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "0 23px"
    height: "47px"
    typography: "{typography.control}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "46px"
  navigation:
    rounded: "{rounded.navigation}"
    padding: "6px"
  navigation-active:
    backgroundColor: "#e2eaf6"
    textColor: "{colors.blue-text}"
    rounded: "{rounded.pill}"
    padding: "11px 15px"
  status:
    backgroundColor: "{colors.green-soft}"
    textColor: "#2b634b"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "23px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "28px"
---
# Design System: EdTrack ONE platform demo

## Overview

**Creative North Star: "Your campus, connected"**

The approved Hybrid direction gives institution operations the calm of warm paper and an editorial hierarchy. Serif headings and figures establish the reading order; compact sans controls, fine sage rules and restrained colored signals keep records easy to scan. The same workspace shell connects overview, students and module previews.

This document captures the implemented, approved demo world only: `/platform`, `/platform/students` and `/platform/modules/*`. It does not redefine the marketing homepage or its typography. The legacy `/admin` remains a separate real SMS shell. Authenticated application access retains Clerk; the isolated preview substitutes only its avatar.

Approval reference: `artifacts/demo-ui-concepts/07-hybrid-landing-palette.png`. The exact selected generation prompt and palette are in `selected-direction.json` beside it; all exploration prompts are in `prompts.json`. These generated images are design artifacts; the application ships no generated raster UI.

**Key Characteristics:**
- Warm paper and lightly bordered off-white surfaces.
- Editorial headings with compact, readable operational controls.
- Forest actions; blue navigation and data; green progress; terracotta attention.
- Connected sample records, explicit demo context and reversible session actions.

## Colors

The palette follows the actual landing palette while giving operational text and attention signals stronger contrast. Frontmatter tokens record implemented values rather than treating the concept image as executable styling.

### Primary

Forest defines the primary enrolment action; its deeper green hover state supplies tactile feedback. Blue marks charts, selected navigation, focus outlines and actionable text.

### Secondary

Green marks learning and progress, sage supports record and completion signals, and their pale tints hold icons without competing with data. Terracotta remains the module accent; the darker attention token is used by the overview, punctuation and attention icons. Attention text sits on the pale warm tint.

### Neutral

Paper is the canvas, panel is the working surface, ink is primary text and muted is supporting operational text. Fine sage lines divide controls; the slightly lighter panel-line frames dashboard panels. The approved concept's muted value was `#6c746f`; the implemented reusable muted token is darker. Preserve this intentional readability adjustment.

**The Semantic Signal Rule.** Keep colored signals tied to navigation, learning, records or attention; preserve text labels alongside color.

## Typography

Bodoni Moda is locally hosted as **Campus Editorial** at `/fonts/bodoni-moda.ttf`; Geist is **Campus Sans** at `/fonts/geist-variable.woff2`. License texts live in `public/fonts/*.txt`. Both faces use font-display swap and Georgia/Arial fallbacks respectively. Editorial headings and figures use the optical-size axis at 12; workspace automatic optical sizing is disabled.

The base display is 53px, reaching 60px at 1600px and stepping through 46px, 41px and 37px as the viewport narrows. Module page titles use 43px and 35px on mobile. Panel headings use 23px at base, 25px wide, 21px intermediate and 23px mobile. Dialog titles use 30px and 27px mobile. Metrics use 34px at base, with responsive 36/28/32/27px variants; journey counts use 32px and 29px mobile. Body and controls use 12–14px sans; quiet metadata uses 9–11px. Table bodies use 12px in the directory and 13px in modules. Preserve tabular numerals for data.

Overview chart labels use 12 SVG units at desktop. On mobile the 880-unit viewBox is scaled, so labels are enlarged to 32 units and values to 30 units (about 13px rendered at the reviewed mobile width). Do not replace those source units with 13px inside the scaled SVG.

**The Editorial Hierarchy Rule.** Use the serif for page and panel headings and principal figures; use the sans for navigation, records, fields and actions.

## Layout

The header has a maximum width of 1800px; main and footer use 1700px, centered with 3% horizontal padding. Header padding is 26px vertically. The desktop overview has four metric columns separated by 16px, then a 1.65:1 two-column panel grid with 18px gaps. Panels have 23px padding; wide panels use 27px. Cards use 14px corners and fine borders.

At 1350px the header wraps and navigation occupies its own full row; panels tighten to 20px padding. At 1000px metrics become two columns and the main grid is 1.3:1. At 759px and below the overview stacks into one column, horizontal gutters become 5%, panels use 19px 17px padding and the navigation scrolls horizontally. The institution chooser and header demo badge hide; the footer still identifies sample data. Heading/actions wrap and form actions stack in reverse order with full-width buttons.

Student tables scroll within their container, with 700px minimum width on mobile. Module tables retain 620px minimum width, calendars 760px, and cards auto-fill at a 250px minimum. Module boards become two columns at 1200px and one at 520px. Module KPI grids auto-fit at a 170px minimum. Keep wide data inside its scrolling surface.

## Elevation & Depth

Panels are flat, with tonal separation and fine borders; module cards explicitly have no shadow. Elevation is reserved for actions and overlays: primary action `0 4px 9px #263a320c`, popover `0 14px 30px #26343214`, dialog `0 24px 70px #26343226`. Navigation uses a translucent panel fill and 12px backdrop blur; modal backdrop uses `#26343255` with 4px blur.

## Shapes

Working panels and table containers use 14px radii, primary and secondary actions 15px, dialog 16px and fields 10px. Navigation has a 40px outer capsule and 30px links. Status chips are pills, utility buttons and signal markers are circles. Module cover/lead surfaces use 9px corners, and compact schedule sessions use 8px. Fine one-pixel borders define grouped records.

## Components

Primary and secondary buttons are 47px high with 23px horizontal padding; the main mobile enrolment action is 43px high. Hover darkens forest or adds a pale sage surface; press moves buttons down 1px. Interactive metric cards whiten and strengthen their border on hover. Links turn blue, journey markers gain a soft ring, and table rows use a subtle tonal hover. Hover effects are guarded by hover capability. The read-notifications action has an explicit disabled state and muted text. Selected navigation uses aria-current and selected filters use aria-pressed.

Every workspace control has a visible blue 2px focus outline with 4px offset. Keep the skip link, labelled navigation landmark, labelled icon actions and native field semantics. Search opens from its button or Cmd/Ctrl+K and filters module destinations. Institution and notification popovers close on Escape or outside pointer interaction; notifications can be marked read.

Native modal dialogs use showModal, labelled titles and optional descriptions, a close button, Escape handling and backdrop dismissal. Background body scrolling locks while open. Dialogs are at most 590px wide, inset at least 16px horizontally and limited to 86svh with internal vertical scrolling. Opening uses 220ms easing and an 8px rise. Color transitions are generally 180ms, press 120–150ms. Reduced-motion preferences remove animation and transitions and restore automatic scrolling.

The overview derives records and figures from the existing sample fixtures. Period selection changes the trend; month buttons expose values with accessible labels and a live caption. Metric and learner-stage links preserve context through status or period filters. Student search covers name, email and course; status filtering, newest/name sorting, incremental show-more and a recoverable empty state operate on the same directory.

Enrolment validates name, email, unique sample email and course; a successful submission adds an active learner at 0% progress and a pending course-price invoice to shared in-memory session state. The learner appears in the directory, course cohort and connected overview counts. Simulated payment marks a pending invoice paid and updates fee/overview totals. These changes reset on refresh. Other module surfaces, assessment queues and timetable content are illustrative previews, not live workflows.

## Do's and Don'ts

### Do

- Do reuse the scoped shell, locally hosted fonts and semantic accent roles.
- Do preserve sample-data notices, labelled controls, keyboard focus and reduced-motion handling.
- Do let navigation, tables and calendars scroll where their content requires width.
- Do keep enrolment, learner records, cohort counts and fee totals connected within the demo session.

### Don't

- Do not apply this document as a homepage typography migration or replace its existing brief.
- Do not present illustrative module content or sample figures as live institution evidence.
- Do not ship generated concept screenshots as interface assets.
- Do not claim demo enrolments or simulated payments persist after refresh.
