'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TourStep {
  id: string
  target: string // CSS selector or data attribute
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  offset?: number
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="header"]',
    title: 'Welcome to Your Dashboard!',
    content: 'Track your courses, progress, and access learning materials. Use "Take Tour" anytime to revisit this guide.',
    position: 'bottom',
  },
  {
    id: 'metrics',
    target: '[data-tour="metrics"]',
    title: 'Key Metrics',
    content: 'Your current units, completed courses, average progress, and total courses at a glance.',
    position: 'bottom',
  },
  {
    id: 'current-units',
    target: '[data-tour="current-units"]',
    title: 'Current Units',
    content: 'View active courses, track progress with the progress bar, and see which include certificates.',
    position: 'top',
  },
  {
    id: 'quick-actions',
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    content: 'Access your profile, schedule, certificates, and support. Update your mobile number here so we can reach you.',
    position: 'top',
  },
  {
    id: 'recent-notifications',
    target: '[data-tour="recent-notifications"]',
    title: 'Recent Notifications',
    content: 'Your latest notifications. Click unread items to mark them as read.',
    position: 'top',
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    content: 'View all notifications. The badge shows unread count.',
    position: 'bottom',
  },
  {
    id: 'schedule',
    target: '[data-tour="schedule"]',
    title: 'View Schedule',
    content: 'Access your class schedule and timetable for upcoming classes and dates.',
    position: 'bottom',
  },
]

interface DashboardTourProps {
  onStartTour?: () => void
}

export default function DashboardTour({ onStartTour }: DashboardTourProps = {}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [showStartButton, setShowStartButton] = useState(false)
  const [elementRect, setElementRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    // Check if user has completed the tour before
    const hasCompletedTour = localStorage.getItem('student-dashboard-tour-completed')
    if (!hasCompletedTour) {
      // Show start button after a short delay
      const timer = setTimeout(() => {
        setShowStartButton(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const startTour = useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
    setShowStartButton(false)
    if (onStartTour) {
      onStartTour()
    }
    // Scroll to first element
    setTimeout(() => {
      const firstStep = tourSteps[0]
      if (firstStep) {
        const element = document.querySelector(firstStep.target)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }, 100)
  }, [onStartTour])

  // Expose startTour function globally for restart button
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).startDashboardTour = startTour
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).startDashboardTour
      }
    }
  }, [startTour])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    localStorage.setItem('student-dashboard-tour-completed', 'true')
  }, [])

  const scrollToStep = useCallback((stepIndex: number) => {
    const step = tourSteps[stepIndex]
    if (step) {
      const element = document.querySelector(step.target)
      if (element) {
        // Calculate the element's position relative to the document
        const rect = element.getBoundingClientRect()
        const elementTop = rect.top + window.pageYOffset
        const elementHeight = rect.height
        const viewportHeight = window.innerHeight
        
        // Calculate scroll position to center the element in viewport
        const scrollPosition = elementTop - (viewportHeight / 2) + (elementHeight / 2)
        
        // Scroll to the calculated position
        window.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        })
        
        // Also use scrollIntoView as a backup with a delay
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center', 
            inline: 'nearest' 
          })
        }, 200)
      }
    }
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      const next = currentStep + 1
      // First scroll to the element
      scrollToStep(next)
      // Then update the step after a delay to allow scrolling to complete
      setTimeout(() => {
        setCurrentStep(next)
      }, 500)
    } else {
      endTour()
    }
  }, [currentStep, scrollToStep, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1
      // First scroll to the element
      scrollToStep(prev)
      // Then update the step after a delay to allow scrolling to complete
      setTimeout(() => {
        setCurrentStep(prev)
      }, 500)
    }
  }, [currentStep, scrollToStep])

  // Update element rect when step changes and tour is active; also on scroll/resize
  useEffect(() => {
    if (!isActive) {
      setElementRect(null)
      return
    }

    const step = tourSteps[currentStep]
    if (!step) return

    const updateElementRect = () => {
      const targetElement = document.querySelector(step.target)
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        setElementRect(rect)
      } else if (currentStep < tourSteps.length - 1) {
        setCurrentStep(prev => prev + 1)
      } else {
        endTour()
      }
    }

    // Initial update after scroll completes
    const initialTimer = setTimeout(updateElementRect, 600)

    // Keep highlight in sync when user scrolls or resizes
    const handleScrollOrResize = () => {
      const targetElement = document.querySelector(step.target)
      if (targetElement) {
        setElementRect(targetElement.getBoundingClientRect())
      }
    }

    // Find scrollable ancestors (content scrolls inside overflow-y-auto div, not window)
    const scrollTargets: (Element | Window)[] = [window]
    const targetElement = document.querySelector(step.target)
    if (targetElement) {
      let el: Element | null = targetElement
      while (el) {
        const style = getComputedStyle(el)
        const overflowY = style.overflowY || style.overflow
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
          scrollTargets.push(el)
        }
        el = el.parentElement
      }
    }

    scrollTargets.forEach((target) => {
      target.addEventListener('scroll', handleScrollOrResize, { passive: true })
    })
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      clearTimeout(initialTimer)
      scrollTargets.forEach((target) => {
        target.removeEventListener('scroll', handleScrollOrResize)
      })
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [currentStep, isActive, endTour])

  if (!isActive && !showStartButton) {
    return null
  }

  if (!isActive && showStartButton) {
    const startCard = (
      <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5">
        <Card className="shadow-lg border-2 border-brand-blue/30 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-blue/10">
                <Map className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <p className="font-semibold text-sm">New to the dashboard?</p>
                <p className="text-xs text-muted-foreground">Take a quick tour to get started</p>
              </div>
              <Button size="sm" onClick={startTour} className="ml-2 bg-brand-blue hover:bg-brand-blue-light">
                Take Tour
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowStartButton(false)
                  localStorage.setItem('student-dashboard-tour-completed', 'true')
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
    return typeof document !== 'undefined' ? createPortal(startCard, document.body) : startCard
  }

  const currentStepData = tourSteps[currentStep]

  if (!elementRect) {
    return null
  }

  // All elements use position: fixed, so use viewport-relative coords from getBoundingClientRect()
  // Do NOT add scrollY/scrollX - that would misposition when content scrolls inside a scroll container
  const tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = currentStepData.position || 'bottom'

  let tooltipTop = 0
  let tooltipLeft = 0

  if (tooltipPosition === 'bottom') {
    tooltipTop = elementRect.bottom + 10
    tooltipLeft = elementRect.left + elementRect.width / 2
  } else if (tooltipPosition === 'top') {
    tooltipTop = elementRect.top - 10
    tooltipLeft = elementRect.left + elementRect.width / 2
  } else if (tooltipPosition === 'right') {
    tooltipTop = elementRect.top + elementRect.height / 2
    tooltipLeft = elementRect.right + 10
  } else {
    tooltipTop = elementRect.top + elementRect.height / 2
    tooltipLeft = elementRect.left - 10
  }

  const tourOverlay = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[70] animate-in fade-in"
        onClick={nextStep}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Highlight - rendered in body so fixed positioning uses viewport coords */}
      <div
        className="fixed z-[71] pointer-events-none"
        style={{
          top: elementRect.top - 4,
          left: elementRect.left - 4,
          width: elementRect.width + 8,
          height: elementRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 4px rgb(37, 99, 235)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[72] w-80 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95"
        style={{
          top: tooltipPosition === 'bottom' ? `${tooltipTop}px` : tooltipPosition === 'top' ? 'auto' : `${tooltipTop}px`,
          bottom: tooltipPosition === 'top' ? `${window.innerHeight - tooltipTop}px` : 'auto',
          left: tooltipPosition === 'left' ? 'auto' : tooltipPosition === 'right' ? `${tooltipLeft}px` : `${tooltipLeft - 160}px`,
          right: tooltipPosition === 'left' ? `${window.innerWidth - tooltipLeft}px` : 'auto',
          transform: tooltipPosition === 'bottom' || tooltipPosition === 'top' ? 'translateX(-50%)' : 'translateY(-50%)',
        }}
      >
        <Card className="shadow-2xl border-2 border-brand-blue/50 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">{currentStepData.title}</h3>
                <p className="text-sm text-muted-foreground">{currentStepData.content}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={endTour}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button size="sm" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button size="sm" onClick={nextStep} className="bg-brand-blue hover:bg-brand-blue-light">
                  {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}
                  {currentStep < tourSteps.length - 1 && (
                    <ChevronRight className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  return typeof document !== 'undefined' ? createPortal(tourOverlay, document.body) : null
}

