import type { LmsShellSettings, LmsTemplateDefinition, LmsTemplateId } from './types'
import { SECTION_CATALOG } from './sections'

const mineralSettings = (overrides?: Partial<LmsShellSettings>): LmsShellSettings => ({
  brandKicker: 'Global Nursing Professional Series',
  unitTitle: '',
  unitIntro: 'One clear pathway for this unit. Move stage by stage — your place is saved automatically.',
  accentMode: 'gradient',
  sidebarDensity: 'comfortable',
  showProgressFooter: true,
  topicNavStyle: 'list',
  primaryCtaLabel: 'Continue learning',
  fontFamily: 'campus-sans',
  buttonStyle: 'rounded',
  fontSizeH1: 52,
  fontSizeH2: 32,
  fontSizeH3: 22,
  fontSizeBody: 16,
  ...overrides,
})

export const LMS_TEMPLATES: Record<LmsTemplateId, LmsTemplateDefinition> = {
  'campus-mineral': {
    id: 'campus-mineral',
    name: 'Campus Mineral',
    description: 'Current learn shell — cream mineral surface, teal accents, immersive sidebar.',
    previewTone: '#f5f3ed',
    tokens: {
      '--lms-ink': '#263432',
      '--lms-ink-soft': '#3d4641',
      '--lms-muted': '#646e68',
      '--lms-accent': '#245ac6',
      '--lms-accent-deep': '#204b9c',
      '--lms-warm': '#b34330',
      '--lms-surface': '#f5f3ed',
      '--lms-panel': '#fafaf7',
      '--lms-line': '#d8dfd2',
      '--lms-sidebar': '#263a32',
      '--lms-sidebar-text': '#f5f3ed',
      '--lms-radius': '16px',
    },
    allowedSections: ['hero', 'pathway_grid', 'stats_strip', 'rich_text', 'cta_row', 'resource_list'],
    defaultSettings: mineralSettings(),
    defaultSections: [
      {
        type: 'hero',
        visible: true,
        settings: { ...SECTION_CATALOG.hero.defaults, kicker: 'Global Nursing Professional Series' },
      },
      {
        type: 'stats_strip',
        visible: true,
        settings: { ...SECTION_CATALOG.stats_strip.defaults },
      },
      {
        type: 'pathway_grid',
        visible: true,
        settings: { ...SECTION_CATALOG.pathway_grid.defaults },
      },
      {
        type: 'rich_text',
        visible: true,
        settings: {
          heading: 'How this unit works',
          body: 'Complete each stage in order. Progress is saved automatically so you can return anytime.',
        },
      },
    ],
  },
  'bold-studio': {
    id: 'bold-studio',
    name: 'Bold Studio',
    description: 'High-contrast teaching shell — strong accent bar, denser cards, sharp focus.',
    previewTone: '#0f172a',
    tokens: {
      '--lms-ink': '#0f172a',
      '--lms-ink-soft': '#1e293b',
      '--lms-muted': '#64748b',
      '--lms-accent': '#2563eb',
      '--lms-accent-deep': '#1d4ed8',
      '--lms-warm': '#dc2626',
      '--lms-surface': '#f8fafc',
      '--lms-panel': '#ffffff',
      '--lms-line': '#e2e8f0',
      '--lms-sidebar': '#0f172a',
      '--lms-sidebar-text': '#f8fafc',
      '--lms-radius': '12px',
    },
    allowedSections: ['hero', 'pathway_grid', 'stats_strip', 'cta_row', 'rich_text', 'resource_list'],
    defaultSettings: mineralSettings({
      brandKicker: 'EdTec Vocational Training',
      accentMode: 'solid',
      sidebarDensity: 'compact',
      topicNavStyle: 'pills',
      primaryCtaLabel: 'Start module',
    }),
    defaultSections: [
      {
        type: 'hero',
        visible: true,
        settings: {
          ...SECTION_CATALOG.hero.defaults,
          kicker: 'EdTec Vocational Training',
          ctaLabel: 'Start module',
          intro: 'Focused modules with clear outcomes. Jump in and keep momentum.',
        },
      },
      {
        type: 'cta_row',
        visible: true,
        settings: { ...SECTION_CATALOG.cta_row.defaults, primaryLabel: 'Start module', secondaryLabel: 'Browse topics' },
      },
      {
        type: 'pathway_grid',
        visible: true,
        settings: { ...SECTION_CATALOG.pathway_grid.defaults, layout: 'stack', heading: 'Topics' },
      },
      {
        type: 'resource_list',
        visible: true,
        settings: { ...SECTION_CATALOG.resource_list.defaults },
      },
    ],
  },
  'editorial-campus': {
    id: 'editorial-campus',
    name: 'Editorial Campus',
    description: 'Cream and forest campus editorial — calm DIDAC presence for overview pages.',
    previewTone: '#fafaf7',
    tokens: {
      '--lms-ink': '#263a32',
      '--lms-ink-soft': '#365648',
      '--lms-muted': '#646e68',
      '--lms-accent': '#208064',
      '--lms-accent-deep': '#1a6b52',
      '--lms-warm': '#9a3a2a',
      '--lms-surface': '#fafaf7',
      '--lms-panel': '#ffffff',
      '--lms-line': '#d8dfd2',
      '--lms-sidebar': '#f5f3ed',
      '--lms-sidebar-text': '#263a32',
      '--lms-radius': '18px',
    },
    allowedSections: ['hero', 'rich_text', 'pathway_grid', 'stats_strip', 'cta_row', 'resource_list'],
    defaultSettings: mineralSettings({
      brandKicker: 'EdTrack Campus',
      accentMode: 'soft',
      topicNavStyle: 'cards',
      primaryCtaLabel: 'Enter unit',
    }),
    defaultSections: [
      {
        type: 'hero',
        visible: true,
        settings: {
          ...SECTION_CATALOG.hero.defaults,
          kicker: 'EdTrack Campus',
          ctaLabel: 'Enter unit',
          intro: 'A calm campus workspace for this unit — sections, resources and progress in one place.',
          showProgress: true,
        },
      },
      {
        type: 'rich_text',
        visible: true,
        settings: {
          heading: 'Learning intent',
          body: 'This pathway balances guided content with space to reflect. Use the sidebar to move between topics.',
        },
      },
      {
        type: 'pathway_grid',
        visible: true,
        settings: { ...SECTION_CATALOG.pathway_grid.defaults, heading: 'Sections', layout: 'three' },
      },
      {
        type: 'stats_strip',
        visible: true,
        settings: { ...SECTION_CATALOG.stats_strip.defaults, label3: 'Focus', value3: 'Campus' },
      },
    ],
  },
}

export const TEMPLATE_LIST = Object.values(LMS_TEMPLATES)

export function getTemplate(id: LmsTemplateId): LmsTemplateDefinition {
  return LMS_TEMPLATES[id]
}
