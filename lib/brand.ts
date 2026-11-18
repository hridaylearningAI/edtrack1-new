/** Official EdTrack ONE wordmark used across the product (learn page, portals, marketing). */
export const EDTRACK_LOGO_SRC = '/images/EdTrack1 logo.png'
export const EDTRACK_LOGO_WIDTH = 1967
export const EDTRACK_LOGO_HEIGHT = 800
export const EDTRACK_BRAND_NAME = 'EdTrack ONE'

/** Encode spaces for absolute URLs (emails, open-graph, etc.). */
export function edtrackLogoAbsoluteUrl(baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, '')
  return `${origin}/images/EdTrack1%20logo.png`
}
