'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import s from './home-platform-details.module.css'

type Fields = {
  name: string
  organisation: string
  email: string
  phone: string
}

type FieldErrors = Partial<Record<keyof Fields, string>>

const empty: Fields = {
  name: '',
  organisation: '',
  email: '',
  phone: '',
}

export function HomeInterestForm() {
  const [form, setForm] = useState<Fields>(empty)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [already, setAlready] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const setField = (key: keyof Fields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    if (serverError) setServerError(null)
  }

  const validate = (): boolean => {
    const next: FieldErrors = {}
    if (!form.name.trim()) next.name = 'Enter your name'
    if (!form.organisation.trim()) next.organisation = 'Enter your organisation'
    if (!form.email.trim()) next.email = 'Enter your email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email'
    if (!form.phone.trim()) next.phone = 'Enter your phone number'
    else if (!/^[+]?[\d\s().-]{7,20}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch('/api/platform-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          organisation: form.organisation.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        alreadySubmitted?: boolean
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setAlready(Boolean(data.alreadySubmitted))
      setDone(true)
      setForm(empty)
      setErrors({})
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className={s.interestSuccess} role="status">
        <CheckCircle2 size={22} aria-hidden />
        <div>
          <strong>{already ? 'Demo request already received' : 'Demo request received'}</strong>
          <p>
            {already
              ? 'Our team already has your details and will be in touch soon.'
              : 'Thank you. Nupur or Aqeel will reach out to walk you through EdTrack ONE.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className={s.interestForm} onSubmit={onSubmit} noValidate>
      <div className={s.interestGrid}>
        <label className={s.interestField}>
          <span>Name</span>
          <input
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Your full name"
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <em>{errors.name}</em> : null}
        </label>
        <label className={s.interestField}>
          <span>Organisation</span>
          <input
            name="organisation"
            autoComplete="organization"
            value={form.organisation}
            onChange={(e) => setField('organisation', e.target.value)}
            placeholder="College, RTO, or campus"
            disabled={submitting}
            aria-invalid={Boolean(errors.organisation)}
          />
          {errors.organisation ? <em>{errors.organisation}</em> : null}
        </label>
        <label className={s.interestField}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="you@organisation.edu"
            disabled={submitting}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <em>{errors.email}</em> : null}
        </label>
        <label className={s.interestField}>
          <span>Phone number</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="+61 …"
            disabled={submitting}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone ? <em>{errors.phone}</em> : null}
        </label>
      </div>

      {serverError ? <p className={s.interestError}>{serverError}</p> : null}

      <button type="submit" className={s.interestSubmit} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} className={s.spin} aria-hidden />
            Sending…
          </>
        ) : (
          <>
            Send demo request <ArrowRight size={17} aria-hidden />
          </>
        )}
      </button>
    </form>
  )
}
