# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences share the marketing surface:

- **Institutions** — owners, directors and academic/operations staff at RTOs, colleges,
  higher education providers and training organisations, evaluating whether to move their
  student management onto EdTrack ONE.
- **Partners** — agents and referral partners who bring students to those institutions and
  work inside the platform's partner portal.

Confirmed by the user: the homepage serves both, not one at the expense of the other.

## Product Purpose

EdTrack ONE runs the whole student journey — enquiry, enrolment, learning delivery,
assessment, fee administration, compliance and completion — inside one connected workspace,
so staff stop reconciling separate systems and learners get a single coherent experience.

Success is an institution moving its day-to-day operations onto the platform.

## Positioning

**One system, not stitched together.** Competing setups require a student management system
plus a separate LMS plus a billing tool, with exports and duplicate records between them.
EdTrack ONE keeps enrolment, learning, assessment, fees and compliance in a single
connected workspace. This is the claim a neighbouring product could not truthfully copy,
and the spine every page should serve.

## Operating Context

- The learner journey is the organising sequence: enquiry → enrolment → learning →
  assessment → fee administration → completion and certificate.
- Distinct portals exist for students, trainers, partners and administrators, plus a
  super-admin tier. Institutions are separate tenants.
- Buyers evaluate against incumbents such as aXcelerate, Wisenet, Moodle and Canvas, and
  typically compare a stitched-together stack against a single platform.

## Capabilities and Constraints

- Student records, enrolments, progress tracking and certificates.
- Course content, activities and assessments, with a unified course player.
- Invoices, payments and partial payments (Stripe); reporting and operational dashboards.
- Notifications, forums and role-specific portals; multi-tenant scoping per institution.
- A working demo account with sample data is the primary self-serve proof.
- The product is in a testing phase: there are no live students yet.
- The marketing homepage renders only for signed-out visitors; signed-in users are
  redirected to the workspace for their role.

## Brand Commitments

- Name: **EdTrack ONE**. Logo: `public/images/EdTrack1 logo.png`.
- Established taglines in use: "Learn. Manage. Comply. All in One." and
  "A smarter way to educate."
- Sign-in and sign-up are handled by Clerk and must remain the auth entry points.
- The self-serve demo lives at `/demo`.

## Evidence on Hand

Real and usable:

- Three named customers, with signed-off testimonials and logos:
  - Australian Institution of Sciences (AISC) — CEO
  - EdTec.Online — Operations Director
  - EdTec Institute Australia (ETIA) — VET Coordinator
  - Logos: `public/images/customers/{aisc,edtec-online,edtec-institute-australia}.png`
- Original editorial photography and generated art in `public/images/landing/`
  (learner portrait, campus architecture, study and collaboration scenes), documented by
  the markdown files beside them.
- The live demo account, which shows the real product with sample data.

**Must not be fabricated.** The reference mockups supplied for this page contain template
filler numbers (500+ institutions, 1M+ learners, 99.9% uptime, 50% admin reduction, 32%
completion lift, 4.8/5 satisfaction), invented customer logos, and a named person
("Sarah Mitchell") who does not exist. `99.9%` appears in an unrelated wireframe for a
different company, confirming these are placeholders. No adoption metrics, outcome
statistics, uptime figures, customer counts or named individuals exist yet. Future work
must not invent them.

## Product Principles

1. **The connection is the product.** Show work moving between enrolment, learning, fees
   and compliance; a feature list of four separate boxes argues the competitor's case.
2. **Serve institution and partner without diluting either.** Both audiences must find
   their path quickly.
3. **Proof comes from the product, not from numbers we do not have.** Lead with the live
   demo and three real customers; never substitute invented statistics.
4. **Demo first, sales close second.** Exploring the working demo is the primary action;
   booking a demo is the strong secondary for serious buyers.
5. **Compliance and admin relief are the felt pain.** Speak to the staff hours lost to
   duplicate entry and reconciliation.

## Accessibility & Inclusion

No product-specific standard has been set by the user. The existing implementation already
commits to a skip link, labelled navigation landmarks, visible focus styles, and
`prefers-reduced-motion` handling; future work must preserve that baseline.
