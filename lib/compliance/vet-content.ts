import type { CompliancePack } from '@/lib/compliance/types'

/**
 * Buyer-facing VET supports included with an EdTrack ONE licence.
 * Content maps the same regulatory areas RTOs need day-to-day.
 */
export const VET_COMPLIANCE_PACK: CompliancePack = {
  label: 'VET / RTO',
  eyebrow: 'Included when you purchase EdTrack ONE',
  intro:
    'These are the VET compliance supports your organisation receives with EdTrack ONE — so RTOs can run training, assessment, reporting and audit readiness in one connected system.',
  sectionsHeading: 'Supports included for VET providers',
  supportLabel: 'Included',
  kpis: [
    { label: 'Frameworks covered', value: '8' },
    { label: 'Support areas', value: '12' },
    { label: 'Capabilities included', value: '78' },
  ],
  sections: [
    {
      id: 'frameworks',
      number: '01',
      title: 'Regulatory frameworks',
      summary:
        'Software support mapped to the Australian VET frameworks your RTO must operate within.',
      capabilities: [
        { label: 'National Vocational Education and Training Regulator (NVR) Act 2011' },
        { label: 'Standards for Registered Training Organisations (Outcome Standards) 2025' },
        { label: 'Australian Qualifications Framework (AQF)' },
        { label: 'AVETMISS national VET data reporting requirements' },
        { label: 'Unique Student Identifier (USI) legislative requirements' },
        { label: 'Privacy Act 1988 and Australian Privacy Principles (APPs)' },
        { label: 'Disability Discrimination Act 1992 — reasonable adjustment' },
        { label: 'Applicable records management and credential policy requirements' },
      ],
    },
    {
      id: 'training-assessment',
      number: '02',
      title: 'Training & assessment',
      summary:
        'Tools to manage scope, strategies, validation and trainer currency for quality delivery.',
      capabilities: [
        { label: 'ASQA scope of registration management' },
        { label: 'Training and assessment strategies (TAS)' },
        { label: 'Training package and unit of competency mapping' },
        { label: 'Assessment tool design and version control' },
        { label: 'Assessment validation schedule and evidence' },
        { label: 'Industry consultation and engagement records' },
        { label: 'Trainer and assessor currency matrix' },
        { label: 'Staff PD and performance management' },
        { label: 'Learning and assessment strategy governance' },
      ],
    },
    {
      id: 'enrolment-progress',
      number: '03',
      title: 'Enrolment, progress & learner support',
      summary:
        'From application and suitability checks through progress monitoring and intervention.',
      capabilities: [
        { label: 'Application and enrolment workflow with Letter of Offer' },
        { label: 'Pre-enrolment LLN / suitability assessment' },
        { label: 'Recognition of Prior Learning (RPL) and credit transfer' },
        { label: 'Academic progress monitoring and support plans' },
        { label: 'At-risk learner identification and interventions' },
        { label: 'Deferral, withdrawal and refund handling' },
        { label: 'Reasonable adjustment and accessibility support' },
        { label: 'Student support, counselling referrals and wellbeing pathways' },
      ],
    },
    {
      id: 'credentials',
      number: '04',
      title: 'Credentials & issuance',
      summary: 'Issue AQF credentials and statements of attainment with controlled audit trails.',
      capabilities: [
        { label: 'Qualification and statement of attainment issuance' },
        { label: 'Credential policy controls and eligibility checks' },
        { label: 'USI verification before credential issuance' },
        { label: 'Certificate and SOA versioning and re-issue logs' },
        { label: 'Graduate / completer reporting packs' },
      ],
    },
    {
      id: 'privacy',
      number: '05',
      title: 'Data security & privacy',
      summary: 'Access, encryption and retention controls aligned to RTO data obligations.',
      capabilities: [
        { label: 'Role-based access and permissions' },
        { label: 'MFA and SSO' },
        { label: 'Data encryption and secure storage' },
        { label: 'Privacy and consent management' },
        { label: 'Records management and retention schedules' },
        { label: 'Audit logs and backup controls' },
      ],
    },
    {
      id: 'audit',
      number: '06',
      title: 'Compliance & audit management',
      summary: 'Self-assessment, evidence packs and corrective actions for audit readiness.',
      capabilities: [
        { label: 'VET quality self-assessment' },
        { label: 'Compliance dashboards and checklists' },
        { label: 'Centralised evidence repository' },
        { label: 'Audit trails and gap identification' },
        { label: 'Corrective actions and continuous improvement logs' },
      ],
    },
    {
      id: 'qa',
      number: '07',
      title: 'Quality assurance',
      summary: 'Continuous improvement across delivery, assessment and learner outcomes.',
      capabilities: [
        { label: 'Continuous improvement policy workflows' },
        { label: 'Learner feedback and course evaluations' },
        { label: 'Assessment validation and quality reporting' },
        { label: 'Industry feedback capture and action tracking' },
      ],
    },
    {
      id: 'integrity',
      number: '08',
      title: 'Academic integrity',
      summary: 'Honesty, plagiarism and misconduct handling for VET assessments.',
      capabilities: [
        { label: 'Plagiarism / academic integrity policy enforcement' },
        { label: 'Plagiarism detection integration' },
        { label: 'Assessment authenticity and verification' },
        { label: 'Misconduct investigation and reporting' },
      ],
    },
    {
      id: 'complaints',
      number: '09',
      title: 'Complaints, appeals & student rights',
      summary: 'Fair complaints and appeals pathways with transparent timeframes.',
      capabilities: [
        { label: 'Complaints, grievances and appeals management' },
        { label: 'Student rights and responsibilities register' },
        { label: 'Refunds and withdrawals workflow' },
        { label: 'Respectful community / anti-bullying reporting' },
      ],
    },
    {
      id: 'governance',
      number: '10',
      title: 'Governance & risk management',
      summary: 'QMS controls for RTO governance, WHS and staff records.',
      capabilities: [
        { label: 'Policy and procedure management (public + internal QMS)' },
        { label: 'Version control for controlled documents' },
        { label: 'Risk and incident registers' },
        { label: 'WHS and EEO / anti-bullying (staff) records' },
        { label: 'Non-qualified trainer/assessor controls' },
      ],
    },
    {
      id: 'reporting',
      number: '11',
      title: 'Reporting & analytics',
      summary: 'National VET data, USI and operational compliance reporting.',
      capabilities: [
        { label: 'AVETMISS export and validation packs' },
        { label: 'USI compliance checks and exception handling' },
        { label: 'Enrolment, progression and completion analytics' },
        { label: 'Regulatory reporting dashboards' },
      ],
    },
    {
      id: 'integrations',
      number: '12',
      title: 'Integration & interoperability',
      summary: 'Connections across SMS/LMS, finance and national reporting channels.',
      capabilities: [
        { label: 'SMS and LMS data interoperability' },
        { label: 'API and third-party integrations' },
        { label: 'SSO and data migration' },
        { label: 'Finance and payments integrations' },
        { label: 'National VET data / government reporting integrations' },
      ],
    },
  ],
}
