/** Canonical EdTrack tenant org (Edtec.online). Override via env. */
export const DEFAULT_CLERK_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_CLERK_DEFAULT_ORGANIZATION_ID?.trim() ||
  process.env.CLERK_DEFAULT_ORGANIZATION_ID?.trim() ||
  "org_3IPkCtWUsZxgzwQWWz3WBjwnmOc"

export const DEFAULT_CLERK_ORGANIZATION_ROLE =
  process.env.CLERK_DEFAULT_ORGANIZATION_ROLE?.trim() || "org:member"
