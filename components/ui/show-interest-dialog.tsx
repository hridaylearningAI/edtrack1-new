'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/lib/hooks/useUser'
import { toast } from 'sonner'

interface ShowInterestDialogProps {
  open: boolean
  onClose: () => void
  courseName: string
  courseId: number
  onSuccess?: () => void
}

interface FormData {
  name: string
  email: string
  mobile: string
  region: string
}

export function ShowInterestDialog({
  open,
  onClose,
  courseName,
  courseId,
  onSuccess,
}: ShowInterestDialogProps) {
  const { user, isAuthenticated } = useUser()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobile: '',
    region: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [hasShownInterest, setHasShownInterest] = useState(false)
  const [isCheckingInterest, setIsCheckingInterest] = useState(false)

  useEffect(() => {
    if (open && isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }))
    }
  }, [open, isAuthenticated, user])

  useEffect(() => {
    if (!open) {
      setHasShownInterest(false)
      return
    }
    const emailToCheck = formData.email.trim()
    if (!emailToCheck) {
      setHasShownInterest(false)
      return
    }

    const check = async () => {
      setIsCheckingInterest(true)
      try {
        const res = await fetch(
          `/api/course-interest?courseId=${courseId}&email=${encodeURIComponent(emailToCheck)}`,
          { headers: { 'Content-Type': 'application/json' } }
        )
        if (res.ok) {
          const data = await res.json()
          setHasShownInterest(data.hasShownInterest || false)
        }
      } catch (err) {
        console.error('Error checking interest:', err)
      } finally {
        setIsCheckingInterest(false)
      }
    }
    const t = setTimeout(check, 100)
    return () => clearTimeout(t)
  }, [open, formData.email, courseId])

  const validate = (): boolean => {
    const e: Partial<FormData> = {}
    if (!formData.name.trim()) e.name = 'Name is required'
    if (!formData.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email'
    if (!formData.mobile.trim()) e.mobile = 'Mobile is required'
    else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(formData.mobile)) e.mobile = 'Invalid mobile'
    if (!formData.region.trim()) e.region = 'Region is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/course-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          courseName,
          ...formData,
          userId: user?.id ?? null,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit interest')

      if (data.alreadySubmitted) {
        setHasShownInterest(true)
        toast.info('You have already shown interest in this course. We will contact you soon!')
      } else {
        setHasShownInterest(true)
        toast.success('Thank you for your interest! We will contact you soon.')
      }

      setFormData({
        name: isAuthenticated && user ? (user.name || '') : '',
        email: isAuthenticated && user ? (user.email || '') : '',
        mobile: '',
        region: '',
      })
      setErrors({})
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Show Interest</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasShownInterest ? (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You&apos;ve already shown interest in this course!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Our team will contact you soon. Thank you for your interest in <strong>{courseName}</strong>!
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                We&apos;re excited you&apos;re interested in <strong>{courseName}</strong>! Fill out the form and we&apos;ll get back to you soon.
              </p>
              <div className="space-y-2">
                <Label htmlFor="si-name">Name *</Label>
                <Input
                  id="si-name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Full name"
                  disabled={isSubmitting || hasShownInterest}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-email">Email *</Label>
                <Input
                  id="si-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Email address"
                  disabled={isSubmitting || hasShownInterest}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-mobile">Mobile *</Label>
                <Input
                  id="si-mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  placeholder="Mobile number"
                  disabled={isSubmitting || hasShownInterest}
                  className={errors.mobile ? 'border-destructive' : ''}
                />
                {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-region">Region *</Label>
                <Input
                  id="si-region"
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  placeholder="e.g. Australia, India, USA"
                  disabled={isSubmitting || hasShownInterest}
                  className={errors.region ? 'border-destructive' : ''}
                />
                {errors.region && <p className="text-sm text-destructive">{errors.region}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isCheckingInterest} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || hasShownInterest || isCheckingInterest} className="flex-1">
                  {isCheckingInterest ? 'Checking...' : hasShownInterest ? 'Already Submitted' : isSubmitting ? 'Submitting...' : 'Submit Interest'}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
