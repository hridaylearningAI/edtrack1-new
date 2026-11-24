import type { LmsSectionDefinition, LmsSectionType } from './types'

export const SECTION_CATALOG: Record<LmsSectionType, LmsSectionDefinition> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Title, kicker, intro and primary call to action',
    fields: [
      { key: 'kicker', label: 'Kicker', type: 'text', placeholder: 'Series name' },
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Unit title' },
      { key: 'intro', label: 'Intro', type: 'textarea', placeholder: 'Short pathway intro' },
      { key: 'ctaLabel', label: 'Primary button', type: 'text', placeholder: 'Continue learning' },
      { key: 'imageUrl', label: 'Background image', type: 'image', placeholder: 'Paste a URL or upload below' },
      { key: 'showProgress', label: 'Show progress rail', type: 'toggle', defaultValue: true },
    ],
    defaults: {
      kicker: 'Learning pathway',
      heading: 'Unit overview',
      intro: 'One clear pathway for this unit. Move stage by stage — your place is saved automatically.',
      ctaLabel: 'Continue learning',
      imageUrl: '',
      showProgress: true,
    },
  },
  pathway_grid: {
    type: 'pathway_grid',
    label: 'Pathway grid',
    description: 'Cards for levels or stages',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        options: [
          { label: 'Three columns', value: 'three' },
          { label: 'Stacked list', value: 'stack' },
        ],
        defaultValue: 'three',
      },
      { key: 'showStatus', label: 'Show status badges', type: 'toggle', defaultValue: true },
    ],
    defaults: {
      heading: 'Your pathway',
      subtitle: 'Complete each stage to unlock the next',
      layout: 'three',
      showStatus: true,
    },
  },
  rich_text: {
    type: 'rich_text',
    label: 'Rich text',
    description: 'Heading and body copy block',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
    ],
    defaults: {
      heading: 'About this unit',
      body: 'Build capability through guided activities, practice and reflection.',
    },
  },
  cta_row: {
    type: 'cta_row',
    label: 'Call to action',
    description: 'Primary and secondary buttons',
    fields: [
      { key: 'primaryLabel', label: 'Primary label', type: 'text' },
      { key: 'secondaryLabel', label: 'Secondary label', type: 'text' },
      { key: 'align', label: 'Align', type: 'select', options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ], defaultValue: 'left' },
    ],
    defaults: {
      primaryLabel: 'Start learning',
      secondaryLabel: 'View resources',
      align: 'left',
    },
  },
  stats_strip: {
    type: 'stats_strip',
    label: 'Stats strip',
    description: 'Three highlight metrics',
    fields: [
      { key: 'label1', label: 'Stat 1 label', type: 'text' },
      { key: 'value1', label: 'Stat 1 value', type: 'text' },
      { key: 'label2', label: 'Stat 2 label', type: 'text' },
      { key: 'value2', label: 'Stat 2 value', type: 'text' },
      { key: 'label3', label: 'Stat 3 label', type: 'text' },
      { key: 'value3', label: 'Stat 3 value', type: 'text' },
    ],
    defaults: {
      label1: 'Progress',
      value1: '0%',
      label2: 'Activities',
      value2: '0/0',
      label3: 'Status',
      value3: 'Ready',
    },
  },
  resource_list: {
    type: 'resource_list',
    label: 'Resources',
    description: 'List of support links or downloads',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'item1', label: 'Item 1', type: 'text' },
      { key: 'item2', label: 'Item 2', type: 'text' },
      { key: 'item3', label: 'Item 3', type: 'text' },
    ],
    defaults: {
      heading: 'Resources',
      item1: 'Unit guide',
      item2: 'Glossary',
      item3: 'Support desk',
    },
  },
}

export const ALL_SECTION_TYPES = Object.keys(SECTION_CATALOG) as LmsSectionType[]
