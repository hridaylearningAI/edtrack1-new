/**
 * Filenames under public/background/NCLEX/ — used for NCLEX course shell backgrounds.
 * When adding images, append filenames here (or run: ls public/background/NCLEX).
 */
export const NCLEX_BACKGROUND_BASE_PATH = "/background/NCLEX" as const

export const NCLEX_BACKGROUND_FILENAMES = [
  "pexels-cedric-fauntleroy-4266931.jpg",
  "pexels-cedric-fauntleroy-4269205.jpg",
  "pexels-cedric-fauntleroy-4269274.jpg",
  "pexels-dr-jyoti-bandi-1632851054-36665085.jpg",
  "pexels-egoagency-5156390.jpg",
  "pexels-guilhemro-203569180-36380795.jpg",
  "pexels-gustavo-fring-3985299.jpg",
  "pexels-gustavo-fring-5888180.jpg",
  "pexels-gustavo-fring-6285354.jpg",
  "pexels-gustavo-fring-6285360.jpg",
  "pexels-gustavo-fring-6285383.jpg",
  "pexels-gustavo-fring-6285384.jpg",
  "pexels-gustavo-fring-7446990.jpg",
  "pexels-gustavo-fring-7446991.jpg",
  "pexels-gustavo-fring-7446996.jpg",
  "pexels-gustavo-fring-7446997.jpg",
  "pexels-gustavo-fring-7446999.jpg",
  "pexels-gustavo-fring-7447007.jpg",
  "pexels-jeff-yen-3550789-5318119.jpg",
  "pexels-karola-g-4021800.jpg",
  "pexels-karola-g-5207015.jpg",
  "pexels-karola-g-5207087.jpg",
  "pexels-konrads-photo-32254525.jpg",
  "pexels-olly-3881247.jpg",
  "pexels-olly-3952124.jpg",
  "pexels-pavel-danilyuk-6753268.jpg",
  "pexels-pavel-danilyuk-6753276.jpg",
  "pexels-pavel-danilyuk-6753296.jpg",
  "pexels-rdne-6129149.jpg",
  "pexels-rdne-6129235.jpg",
  "pexels-rdne-6129243.jpg",
  "pexels-rdne-6129442.jpg",
  "pexels-rdne-6129502.jpg",
  "pexels-rdne-6129581.jpg",
  "pexels-rdne-6129677.jpg",
  "pexels-rdne-6129680.jpg",
  "pexels-rdne-6129681.jpg",
  "pexels-rdne-6129685.jpg",
  "pexels-rdne-6129688.jpg",
  "pexels-rdne-6129689.jpg",
  "pexels-rdne-6129870.jpg",
  "pexels-rdne-6520080.jpg",
  "pexels-shkrabaanthony-7345459.jpg",
  "pexels-shvetsa-4483332.jpg",
  "pexels-thirdman-7659567.jpg",
  "pexels-thirdman-7659691.jpg",
  "pexels-thirdman-7659865.jpg",
  "pexels-tima-miroshnichenko-6010782.jpg",
  "pexels-tima-miroshnichenko-6010789.jpg",
  "pexels-tima-miroshnichenko-6010859.jpg",
  "pexels-tima-miroshnichenko-6011613.jpg",
  "pexels-vidalbalielojrfotografia-4006979.jpg",
] as const

export function nclexBackgroundUrl(filename: string): string {
  return `${NCLEX_BACKGROUND_BASE_PATH}/${encodeURIComponent(filename)}`
}
