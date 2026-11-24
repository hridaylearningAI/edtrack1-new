export type ComplianceCapability = {
  label: string
}

export type ComplianceSection = {
  id: string
  number: string
  title: string
  summary: string
  capabilities: ComplianceCapability[]
}

export type CompliancePack = {
  label: string
  /** Small eyebrow above the intro, e.g. "Included with your licence" */
  eyebrow: string
  intro: string
  /** Main column heading for the capability list */
  sectionsHeading: string
  /** Status chip on each capability row */
  supportLabel: string
  kpis: { label: string; value: string }[]
  sections: ComplianceSection[]
}
