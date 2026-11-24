/** Ten learn-shell color schemas for Theme Studio color picker. */

export type LmsColorSchemaId =
  | 'campus-mineral'
  | 'ocean-slate'
  | 'forest-canopy'
  | 'graphite-amber'
  | 'coastal-teal'
  | 'sandstone'
  | 'midnight-coral'
  | 'parchment-ink'
  | 'alpine-sky'
  | 'orchard'

export type LmsColorSchema = {
  id: LmsColorSchemaId
  name: string
  description: string
  /** Swatch stops shown in the picker */
  swatches: [string, string, string]
  /** CSS custom properties applied to the learn shell */
  tokens: Record<string, string>
}

const schema = (
  id: LmsColorSchemaId,
  name: string,
  description: string,
  swatches: [string, string, string],
  core: {
    ink: string
    inkSoft: string
    muted: string
    accent: string
    accentDeep: string
    warm: string
    surface: string
    panel: string
    line: string
    sidebar: string
    sidebarText: string
    green: string
    greenSoft: string
    accentSoft: string
  },
): LmsColorSchema => ({
  id,
  name,
  description,
  swatches,
  tokens: {
    '--lms-ink': core.ink,
    '--lms-ink-soft': core.inkSoft,
    '--lms-muted': core.muted,
    '--lms-accent': core.accent,
    '--lms-accent-deep': core.accentDeep,
    '--lms-warm': core.warm,
    '--lms-surface': core.surface,
    '--lms-panel': core.panel,
    '--lms-line': core.line,
    '--lms-sidebar': core.sidebar,
    '--lms-sidebar-text': core.sidebarText,
    '--lms-radius': '16px',
    '--gnps-ink': core.ink,
    '--gnps-ink-soft': core.inkSoft,
    '--gnps-ink-copy': core.inkSoft,
    '--gnps-ink-copy-muted': core.muted,
    '--gnps-ink-copy-soft': core.muted,
    '--gnps-teal': core.accent,
    '--gnps-teal-deep': core.accentDeep,
    '--gnps-teal-pale': core.accentSoft,
    '--gnps-gold': core.warm,
    '--gnps-mineral': core.surface,
    '--gnps-line': core.line,
    '--ink': core.ink,
    '--muted-ink': core.muted,
    '--line': core.line,
    '--primary': core.sidebar,
    '--primary-hover': core.accentDeep,
    '--blue': core.accent,
    '--blue-soft': core.accentSoft,
    '--green': core.green,
    '--green-soft': core.greenSoft,
    '--sidebar': core.panel,
    '--sidebar-hover': core.surface,
    '--paper': core.surface,
    '--panel': core.panel,
    /* Deep brand used for hero image overlay / fallback */
    '--hero-scrim': core.sidebar,
    '--hero-accent': core.warm,
  },
})

export const LMS_COLOR_SCHEMAS: Record<LmsColorSchemaId, LmsColorSchema> = {
  'campus-mineral': schema(
    'campus-mineral',
    'Campus Mineral',
    'Cream surface, forest sidebar, campus blue accents.',
    ['#f5f3ed', '#263a32', '#245ac6'],
    {
      ink: '#263432',
      inkSoft: '#3d4641',
      muted: '#646e68',
      accent: '#245ac6',
      accentDeep: '#204b9c',
      warm: '#b34330',
      surface: '#f5f3ed',
      panel: '#fafaf7',
      line: '#d8dfd2',
      sidebar: '#263a32',
      sidebarText: '#f5f3ed',
      green: '#208064',
      greenSoft: '#e5eee6',
      accentSoft: '#e6edf7',
    },
  ),
  'ocean-slate': schema(
    'ocean-slate',
    'Ocean Slate',
    'Cool slate panels with deep ocean blue.',
    ['#f4f7fb', '#1e293b', '#2563eb'],
    {
      ink: '#0f172a',
      inkSoft: '#1e293b',
      muted: '#64748b',
      accent: '#2563eb',
      accentDeep: '#1d4ed8',
      warm: '#0ea5e9',
      surface: '#f4f7fb',
      panel: '#ffffff',
      line: '#dbe3ef',
      sidebar: '#0f172a',
      sidebarText: '#f8fafc',
      green: '#0284c7',
      greenSoft: '#e0f2fe',
      accentSoft: '#dbeafe',
    },
  ),
  'forest-canopy': schema(
    'forest-canopy',
    'Forest Canopy',
    'Deep greens and soft moss surfaces.',
    ['#f3f6f2', '#1b3a2a', '#208064'],
    {
      ink: '#14261c',
      inkSoft: '#1b3a2a',
      muted: '#4f6a5a',
      accent: '#208064',
      accentDeep: '#16634c',
      warm: '#a67c2d',
      surface: '#f3f6f2',
      panel: '#f8faf7',
      line: '#d5e0d6',
      sidebar: '#1b3a2a',
      sidebarText: '#eef6f0',
      green: '#208064',
      greenSoft: '#e3f0e7',
      accentSoft: '#dcefe4',
    },
  ),
  'graphite-amber': schema(
    'graphite-amber',
    'Graphite Amber',
    'Charcoal shell with amber highlights.',
    ['#f6f5f2', '#1c1c1c', '#d97706'],
    {
      ink: '#1c1c1c',
      inkSoft: '#2a2a2a',
      muted: '#6b6b6b',
      accent: '#d97706',
      accentDeep: '#b45309',
      warm: '#f59e0b',
      surface: '#f6f5f2',
      panel: '#ffffff',
      line: '#e4e1da',
      sidebar: '#1c1c1c',
      sidebarText: '#f6f5f2',
      green: '#b45309',
      greenSoft: '#fef3c7',
      accentSoft: '#ffedd5',
    },
  ),
  'coastal-teal': schema(
    'coastal-teal',
    'Coastal Teal',
    'Bright teal accents on airy coastal gray.',
    ['#f2f8f8', '#134e4a', '#0d9488'],
    {
      ink: '#134e4a',
      inkSoft: '#115e59',
      muted: '#5b7c7a',
      accent: '#0d9488',
      accentDeep: '#0f766e',
      warm: '#f97316',
      surface: '#f2f8f8',
      panel: '#ffffff',
      line: '#d5e6e4',
      sidebar: '#134e4a',
      sidebarText: '#ecfdf8',
      green: '#0d9488',
      greenSoft: '#ccfbf1',
      accentSoft: '#ccfbf1',
    },
  ),
  sandstone: schema(
    'sandstone',
    'Sandstone',
    'Warm sand ground with clay and ink.',
    ['#f7f1e8', '#3b2f2a', '#9a5b3c'],
    {
      ink: '#3b2f2a',
      inkSoft: '#4c3c35',
      muted: '#7a6a60',
      accent: '#9a5b3c',
      accentDeep: '#7c452c',
      warm: '#c48a3a',
      surface: '#f7f1e8',
      panel: '#fffaf4',
      line: '#e6d9c8',
      sidebar: '#3b2f2a',
      sidebarText: '#f7f1e8',
      green: '#7c6a45',
      greenSoft: '#f1e6d4',
      accentSoft: '#f3e7dc',
    },
  ),
  'midnight-coral': schema(
    'midnight-coral',
    'Midnight Coral',
    'Navy night shell with coral signals.',
    ['#f5f7fb', '#111827', '#e11d48'],
    {
      ink: '#111827',
      inkSoft: '#1f2937',
      muted: '#6b7280',
      accent: '#e11d48',
      accentDeep: '#be123c',
      warm: '#fb7185',
      surface: '#f5f7fb',
      panel: '#ffffff',
      line: '#dce3ef',
      sidebar: '#111827',
      sidebarText: '#f8fafc',
      green: '#be123c',
      greenSoft: '#ffe4e6',
      accentSoft: '#ffe4e6',
    },
  ),
  'parchment-ink': schema(
    'parchment-ink',
    'Parchment Ink',
    'Paper white with strong ink and steel blue.',
    ['#fbfaf6', '#1a1a1a', '#335c81'],
    {
      ink: '#1a1a1a',
      inkSoft: '#2c2c2c',
      muted: '#6a6a6a',
      accent: '#335c81',
      accentDeep: '#274866',
      warm: '#8b5e34',
      surface: '#fbfaf6',
      panel: '#ffffff',
      line: '#e7e3d8',
      sidebar: '#1a1a1a',
      sidebarText: '#fbfaf6',
      green: '#335c81',
      greenSoft: '#e8eef4',
      accentSoft: '#e8eef4',
    },
  ),
  'alpine-sky': schema(
    'alpine-sky',
    'Alpine Sky',
    'Cool mist surfaces with alpine blue.',
    ['#f3f6f9', '#243447', '#3b82f6'],
    {
      ink: '#243447',
      inkSoft: '#31475c',
      muted: '#6b7c8d',
      accent: '#3b82f6',
      accentDeep: '#2563eb',
      warm: '#38bdf8',
      surface: '#f3f6f9',
      panel: '#ffffff',
      line: '#d7e0ea',
      sidebar: '#243447',
      sidebarText: '#f3f6f9',
      green: '#0284c7',
      greenSoft: '#e0f2fe',
      accentSoft: '#dbeafe',
    },
  ),
  orchard: schema(
    'orchard',
    'Orchard',
    'Soft orchard green with plum accents.',
    ['#f5f7f2', '#2f3b2e', '#7c3a5d'],
    {
      ink: '#2f3b2e',
      inkSoft: '#3d4b3c',
      muted: '#6a7568',
      accent: '#7c3a5d',
      accentDeep: '#632e4a',
      warm: '#c45c26',
      surface: '#f5f7f2',
      panel: '#fbfcf8',
      line: '#d9e0d4',
      sidebar: '#2f3b2e',
      sidebarText: '#f5f7f2',
      green: '#4d7c5a',
      greenSoft: '#e5efe6',
      accentSoft: '#f3e8ee',
    },
  ),
}

export const COLOR_SCHEMA_LIST: LmsColorSchema[] = Object.values(LMS_COLOR_SCHEMAS)

export const DEFAULT_COLOR_SCHEMA_ID: LmsColorSchemaId = 'campus-mineral'

export function isLmsColorSchemaId(value: string | null | undefined): value is LmsColorSchemaId {
  return !!value && value in LMS_COLOR_SCHEMAS
}

export function getColorSchema(id: LmsColorSchemaId | string | null | undefined): LmsColorSchema {
  if (isLmsColorSchemaId(id)) return LMS_COLOR_SCHEMAS[id]
  return LMS_COLOR_SCHEMAS[DEFAULT_COLOR_SCHEMA_ID]
}

export function colorSchemaCssVars(id: LmsColorSchemaId | string | null | undefined): Record<string, string> {
  return { ...getColorSchema(id).tokens }
}
