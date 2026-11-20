'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, ClipboardList, GraduationCap, Plus, Users, Wallet } from 'lucide-react'
import { HomeInterestForm } from './home-interest-form'
import s from './home-platform-details.module.css'

const solutions = [
  { icon: GraduationCap, color: 'blue', title: 'Put your students first.', label: 'Student management', description: 'From the first enquiry to the final certificate. Keep student records, enrolments, and progress connected.', features: ['Student profiles & enrolments', 'Progress tracking & certificates'], link: 'Explore student management' },
  { icon: BookOpen, color: 'red', title: 'Give learning room to grow.', label: 'Learning & delivery', description: 'Bring courses, resources, and assessments into a focused experience for learners and trainers.', features: ['Course content & assessments', 'Dedicated student & trainer portals'], link: 'Explore learning' },
  { icon: Wallet, color: 'green', title: 'Make the everyday easier.', label: 'Campus operations', description: 'Bring clarity to the work behind great education, with billing, reporting, and administration in one place.', features: ['Invoices & payment tracking', 'Reports & operational insights'], link: 'Explore campus operations' },
]
const testimonials = [
  { tone: 'blue', logo: '/images/customers/aisc.png', width: 320, height: 320, org: 'Australian Institution of Sciences (AISC)', role: 'CEO', quote: 'EdTrackOne has provided us with a more organised and integrated approach to managing student information, academic processes and institutional administration. Having essential functions accessible through one platform has improved visibility, reduced duplication and supported more consistent day-to-day operations. EdTrackOne is helping us strengthen efficiency, accountability and our capacity to deliver a better experience for both students and staff.' },
  { tone: 'red', logo: '/images/customers/edtec-online.png', width: 600, height: 206, org: 'EdTec.Online', role: 'Operations Director', quote: 'EdTrackOne has given EdTec.Online an integrated platform for managing learners, programs, engagement and administrative activities across our expanding online education environment. Its flexibility supports multiple programs and diverse learner groups while helping our team maintain consistency and visibility. The platform strengthens our ability to deliver accessible, scalable and well-managed learning experiences to students across different locations.' },
  { tone: 'green', logo: '/images/customers/edtec-institute-australia.png', width: 600, height: 212, org: 'EdTec Institute Australia (ETIA)', role: 'VET Coordinator', quote: 'EdTrackOne enables us to manage the student journey from initial enquiry and enrolment through learning, assessment, fee administration and completion within a connected digital environment. The platform supports greater coordination across our academic, administrative and compliance activities while giving management access to timely and meaningful information. It provides a strong operational foundation as ETIA continues to grow.' },
]
const steps = [
  { icon: Users, title: 'Welcome your learners', description: 'Give every student a clear beginning with organised profiles and enrolments.' },
  { icon: BookOpen, title: 'Create space for learning', description: 'Connect courses, learning resources, and assessments to the people who need them.' },
  { icon: GraduationCap, title: 'Celebrate the progress', description: 'Follow each milestone, review outcomes, and recognise achievement with certificates.' },
]
const faqs = [
  ['Who is EdTrack ONE for?', 'EdTrack ONE brings together student administration and learning workflows for vocational education providers, higher education teams, and training organisations. Students, trainers, administrators and referral partners have dedicated spaces to work.'],
  ['What can I explore in the demo?', 'The room tour and Explore demo use sample data so you can look around without signing in. Request a demo if you want a walkthrough for your organisation.'],
  ['I already have an account. Where do I go?', 'This page is for visitors exploring EdTrack ONE. If your organisation already uses the platform, use the sign-in link your team shared, or request a demo and we will point you to the right workspace.'],
]

const brochureModules = [
  {
    title: 'Connect', blurb: 'Attract and engage prospective students', icon: Users, tone: 'blue',
    heading: 'Pick up where the enquiry began.',
    detail: 'Mia asks about the Diploma of Nursing. Admissions can see what she’s interested in and when to follow up.',
    record: 'Enquiry record', status: 'New enquiry',
    fields: [['Course interest', 'Diploma of Nursing'], ['Next action', 'Send course information']],
  },
  {
    title: 'Enrol', blurb: 'Admissions, records and compliance', icon: ClipboardList, tone: 'green',
    heading: 'Turn an enquiry into an enrolment.',
    detail: 'Mia accepts her offer. The team can check her intake and admissions documents from the student record.',
    record: 'Student record', status: 'Enrolled',
    fields: [['Course', 'Diploma of Nursing'], ['Admissions documents', 'Verified']],
  },
  {
    title: 'Learn', blurb: 'Deliver and assess learning', icon: BookOpen, tone: 'red',
    heading: 'See what Mia is working on.',
    detail: 'Mia opens her first unit and submits a case study. Her trainer can see what’s ready for feedback.',
    record: 'Learning progress', status: 'Submitted',
    fields: [['Current unit', 'Nursing fundamentals'], ['Assessment', 'Case study']],
  },
  {
    title: 'Pay', blurb: 'Fees, invoicing and scholarships', icon: Wallet, tone: 'green',
    heading: 'Give finance a clear view of fees.',
    detail: 'Finance can see which instalment Mia has paid and when the next one is due.',
    record: 'Fee statement', status: 'First instalment paid',
    fields: [['Payment plan', 'Two instalments'], ['Next instalment', 'Due 15 July']],
  },
  {
    title: 'Insight', blurb: 'Outcomes and decisions', icon: BarChart3, tone: 'blue',
    heading: 'See where a learner needs support.',
    detail: 'Mia misses her next assessment deadline. Her trainer can spot the overdue work and follow up before the next class.',
    record: 'Learner insight', status: 'Follow-up needed',
    fields: [['Assessment', 'Clinical reflection'], ['Next action', 'Check in with Mia']],
  },
] as const

function DemoJourney() {
  const [selected, setSelected] = useState(0)
  const item = brochureModules[selected]

  return (
    <div className={s.demoJourney}>
      <div className={s.journeySelector} role="group" aria-label="Sample learner journey stages">
        {brochureModules.map((step, index) => (
          <button
            key={step.title}
            type="button"
            aria-pressed={selected === index}
            aria-controls="demo-journey-example"
            onClick={() => setSelected(index)}
          >
            <step.icon size={17} strokeWidth={1.75} aria-hidden />
            {step.title}
          </button>
        ))}
      </div>
      <div id="demo-journey-example" className={s.journeyExample} data-tone={item.tone} aria-live="polite">
        <div className={s.journeyCopy}>
          <p>{item.blurb}</p>
          <h3>{item.heading}</h3>
          <p>{item.detail}</p>
        </div>
        <div className={s.sampleRecord}>
          <div className={s.recordHeader}>
            <span><item.icon size={16} aria-hidden /> {item.record}</span>
            <span>Sample data</span>
          </div>
          <div className={s.recordLearner}>
            <span aria-hidden>MT</span>
            <strong>Mia Thompson</strong>
            <span className={s.recordStatus}>{item.status}</span>
          </div>
          <dl>
            {item.fields.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

const demoContacts = [
  {
    initials: 'NC',
    name: 'Nupur Chanda',
    email: 'nupur.chanda@edtec.edu.au',
    phone: '+61 470 233 998',
  },
  {
    initials: 'AA',
    name: 'Aqeel Asad',
    email: 'aqeel.asad@edtec.edu.au',
    phone: '+61 475 881 496',
  },
]

export function HomePlatformDetails() {
  return <div className={s.details} id="platform-details">
    <div className={s.content}>
      <section id="platform" className={s.audience} aria-label="Education providers"><span className={s.eyebrow}>Designed for the way you educate</span><div><span><GraduationCap size={18}/>Vocational education</span><span><BookOpen size={18}/>Higher education</span><span><Users size={18}/>Training organisations</span></div></section>
      <section id="solutions" className={s.section} aria-labelledby="solutions-title">
        <div className={s.heading}><div><p className={s.eyebrow}>The room is only the beginning</p><h2 id="solutions-title">Everything in its place.<br/><span>Everyone moving forward.</span></h2></div><p>Bring the important parts of your campus together, so your people can focus on what they do best.</p></div>
        <div className={s.solutions}>{solutions.map((item, index) => <article key={item.label} data-tone={item.color} className={s.solution}><div className={s.solutionTop}><item.icon size={25} strokeWidth={1.5}/><span>0{index + 1}</span></div><p className={s.label}>{item.label}</p><h3>{item.title}</h3><p>{item.description}</p><ul>{item.features.map(feature => <li key={feature}><Check size={13}/>{feature}</li>)}</ul><Link href="/demo">{item.link}<ArrowUpRight size={17}/></Link></article>)}</div>
      </section>
      <section id="workflow" className={s.workflow} aria-labelledby="workflow-title"><div><p className={s.eyebrow}>One journey. Every step.</p><h2 id="workflow-title">From first hello<br/>to what comes next.</h2><p>Keep the student journey connected, with a shared place for the people who make it happen.</p><Link href="/demo" className={s.textLink}>See how it comes together <ArrowRight size={17}/></Link><div className={s.roles}><span>Administrators</span><span>Trainers</span><span>Students</span><span>Partners</span></div></div><ol className={s.steps}>{steps.map((step, index) => <li key={step.title}><span className={s.stepNumber}>0{index + 1}</span><div><step.icon size={20} strokeWidth={1.5}/><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol></section>
      <section id="customers" className={s.section} aria-labelledby="customers-title"><div className={s.heading}><div><p className={s.eyebrow}>In their words</p><h2 id="customers-title">A shared direction.<br/><span>Different perspectives.</span></h2></div><p>Perspectives from vocational, higher and online education teams on bringing their work together in EdTrack ONE.</p></div><div className={s.testimonials}>{testimonials.map(item => <figure key={item.org} className={s.testimonial} data-tone={item.tone}><div className={s.customerLogo}><Image src={item.logo} alt={item.org} width={item.width} height={item.height}/></div><blockquote>{item.quote}</blockquote><figcaption><strong>{item.role}</strong><span>{item.org}</span></figcaption></figure>)}</div></section>
      <section id="questions" className={`${s.section} ${s.faq}`} aria-labelledby="faq-title"><div><p className={s.eyebrow}>A little more clarity</p><h2 id="faq-title">Good questions.<br/><span>Clear answers.</span></h2></div><div className={s.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18}/></summary><p>{answer}</p></details>)}</div></section>
    </div>
    <section id="show-interest" className={s.closing} aria-labelledby="interest-title">
      <div className={s.interestLayout}>
        <div className={s.demoBand}>
          <div className={s.demoImagePanel}>
            <Image
              src="/images/landing/campus-collaboration.jpg"
              alt=""
              fill
              sizes="(max-width: 760px) 90vw, (max-width: 1280px) 48vw, 580px"
            />
            <div className={s.demoImageCopy}>
              <h2 id="interest-title">See EdTrack ONE<br />in action.</h2>
              <p>See how admissions, learning, fees and compliance fit together in one workspace.</p>
            </div>
          </div>

          <div className={s.demoFormPanel}>
            <h3>Request a demo</h3>
            <p className={s.demoFormLead}>Tell us a little about your organisation. Our team will be in touch to arrange a walkthrough.</p>
            <HomeInterestForm />
          </div>
        </div>

        <div className={s.demoContacts}>
          <h3>Talk to our team</h3>
          <div className={s.contactCards}>
            {demoContacts.map(person => (
              <div key={person.email} className={s.contactCard}>
                <span className={s.contactAvatar} aria-hidden>{person.initials}</span>
                <div>
                  <strong>{person.name}</strong>
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                  <a href={`tel:${person.phone.replace(/\s/g, '')}`}>{person.phone}</a>
                </div>
              </div>
            ))}
          </div>
          <Link href="/demo" className={s.demoGhost}>
            Explore the demo <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>

        <details className={s.demoTopics}>
          <summary>What can I see in the demo? <Plus size={17} aria-hidden /></summary>
          <DemoJourney />
        </details>
      </div>
    </section>
    <footer className={s.footer}><div className={s.footerMain}><div><Link href="/" aria-label="EdTrack ONE home"><Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={1967} height={800}/></Link><p>More connected. More possible.</p></div><nav aria-label="Footer navigation"><a href="#platform">Platform</a><a href="#solutions">Solutions</a><a href="#workflow">How it works</a><a href="#customers">Customers</a><a href="#show-interest">Show interest</a><Link href="/demo">Demo</Link></nav></div><div className={s.footerBottom}><span>© 2026 EdTrack ONE. All rights reserved.</span><span><i/><i/><i/> Built around education.</span></div></footer>
  </div>
}
