'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn, useAuth } from '@clerk/nextjs'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, LayoutGrid, Loader2 } from 'lucide-react'
import Link from 'next/link'
import styles from '@/components/platform/demo-design.module.css'
import { DemoSurface } from '@/components/platform/demo-surface'

import { getDemoPlatformEmail } from '@/lib/demo-platform'


export default function DemoLoginPage() {
  const router = useRouter()
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState(getDemoPlatformEmail())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace('/platform')
    }
  }, [authLoaded, isSignedIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLoaded || !signIn || !setActive) {
      setError('Authentication is still loading. Please try again.')
      return
    }

    const expected = getDemoPlatformEmail()
    if (email.trim().toLowerCase() !== expected) {
      setError(`Use the demo platform account (${expected}).`)
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    setSubmitting(true)
    try {
      // Server verifies password + issues a Clerk sign-in ticket (no email OTP).
      const res = await fetch('/api/auth/demo-sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ticket) {
        setError(data?.error || 'Demo sign-in failed.')
        return
      }

      const result = await signIn.create({
        strategy: 'ticket',
        ticket: data.ticket,
      })

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        router.replace('/platform')
        return
      }

      setError('Could not complete demo session. Try again.')
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[]; message?: string }
      const message =
        clerkErr?.errors?.[0]?.message ||
        clerkErr?.message ||
        'Sign-in failed. Check the demo credentials.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoaded && isSignedIn) {
    return <div className={styles.loading} role="status"><Loader2 className="h-5 w-5 animate-spin" /> Opening your workspace…</div>
  }

  return <DemoSurface>
    <header className={styles.header}><Link href="/" aria-label="EdTrack ONE home"><Image className={styles.logo} src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={1967} height={800} priority /></Link><Link href="/" className={styles.quietLink}><ArrowLeft size={15} /> Back to home</Link></header>
    <main className={styles.loginLayout}>
      <section className={styles.story} data-demo-reveal aria-labelledby="demo-title">
        <svg className={styles.outlines} viewBox="0 0 440 440" fill="none" aria-hidden="true"><rect x="45" y="45" width="330" height="330" rx="75" stroke="#d8e3f1" transform="rotate(-25 220 220)" /><rect x="65" y="65" width="330" height="330" rx="75" stroke="#ecd3d6" transform="rotate(-25 220 220)" /><rect x="85" y="85" width="330" height="330" rx="75" stroke="#d1e4d9" transform="rotate(-25 220 220)" /></svg>
        <div className={styles.dots} aria-hidden="true"><i /><i /><i /></div><p className={styles.eyebrow}>YOUR CONNECTED CAMPUS, A CLOSER LOOK</p><h1 id="demo-title">See the possibilities.<br /><span>Experience the platform.</span></h1><p>Step inside EdTrack ONE and discover a simpler way to connect your students, learning, and everyday operations.</p>
        <div className={styles.journey}>{[
          { icon: LayoutGrid, title: 'Start with the big picture', text: 'A clear overview of every campus module.', tone: 'blue' },
          { icon: BookOpen, title: 'Explore at your own pace', text: 'Browse learning and operations walkthroughs.', tone: 'red' },
          { icon: GraduationCap, title: 'Find your next step', text: 'Open Student Management from one workspace.', tone: 'green' },
        ].map(item => <div key={item.title}><span className={styles.icon} data-tone={item.tone}><item.icon size={21} /></span><div><b>{item.title}</b><small>{item.text}</small></div></div>)}</div>
      </section>
      <section className={styles.loginCard} data-demo-reveal aria-labelledby="login-title"><span className={styles.badge}>DEMO WORKSPACE</span><h2 id="login-title">Welcome inside.</h2><p>Sign in with your dedicated demo account to explore the platform.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div><label htmlFor="demo-email">Demo email</label><input id="demo-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} aria-describedby="demo-account-hint" /><small id="demo-account-hint" className={styles.hint}>Use the demo account provided by your EdTrack team.</small></div>
          <div><label htmlFor="demo-password">Password</label><div className={styles.password}><input id="demo-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your demo password" aria-describedby={error ? 'demo-error' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {error && <p id="demo-error" role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={submitting || !isLoaded}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Explore your workspace <ArrowRight size={17} /></>}</button>
        </form><div className={styles.loginFooter}>Already an EdTrack user? <Link href="/sign-in">Sign in to your account</Link></div>
      </section>
    </main><footer className={styles.footer}>EdTrack ONE · Learn. Manage. Comply. All in One.</footer>
  </DemoSurface>
}
