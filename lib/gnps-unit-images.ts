/**
 * GNPS unit imagery for the SMS learn overview.
 * Prefers the course row image_url; falls back to the portfolio CDN assets.
 */
const GNPS_UNIT_IMAGE_FALLBACKS: Record<string, string> = {
  ETHTL115: "https://edtec.online/images/gnps/ethtl115-fundamentals.jpg",
  ETHTL116: "https://edtec.online/images/gnps/ethtl116-safety-infection-control.jpg",
  ETHTL117: "https://edtec.online/images/gnps/ethtl117-medication-safety.jpg",
  ETHTL118: "https://edtec.online/images/gnps/ethtl118-adult-nursing-one.jpg",
  ETHTL119: "https://edtec.online/images/gnps/ethtl119-adult-nursing-two.jpg",
  ETHTL120: "https://edtec.online/images/gnps/ethtl120-maternal-newborn.jpg",
  ETHTL121: "https://edtec.online/images/gnps/ethtl121-paediatric.jpg",
  ETHTL122: "https://edtec.online/images/gnps/ethtl122-mental-health.jpg",
  ETHTL123: "https://edtec.online/images/gnps/ethtl123-professional-ethics.jpg",
  ETHTL124: "https://edtec.online/images/gnps/ethtl124-clinical-skills.jpg",
}

export function getGnpsUnitImageUrl(
  courseCode?: string | null,
  enrollmentImageUrl?: string | null,
): string | null {
  const fromEnrollment = enrollmentImageUrl?.trim()
  if (fromEnrollment) return fromEnrollment

  const code = (courseCode ?? "").trim().toUpperCase()
  return GNPS_UNIT_IMAGE_FALLBACKS[code] ?? null
}
