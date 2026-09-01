export function slugifyTenantName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return slug || "tenant"
}

export function withUniqueSlugSuffix(baseSlug: string, suffix: string): string {
  const trimmed = baseSlug.slice(0, Math.max(1, 48 - suffix.length - 1))
  return `${trimmed}-${suffix}`
}
