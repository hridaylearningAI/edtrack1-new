/**
 * Shared primary header chrome for learn/course content (slides, quizzes, notes, etc.)
 * so header height and padding match across page types.
 */
export const COURSE_VIEW_HEADER_CLASS =
  "relative h-16 min-h-[4rem] w-full shrink-0 flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15202b] px-3 sm:px-6 z-10"

/** Bottom accent strip — use inside headers that set `relative`. */
export const COURSE_VIEW_HEADER_GRADIENT =
  "pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden"
