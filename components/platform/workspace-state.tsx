'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createDemoEnrolment, initialInvoices, initialLearners, type DemoInvoice, type DemoLearner } from '@/lib/demo-workspace'

type WorkspaceState = {
  learners: DemoLearner[]
  invoices: DemoInvoice[]
  enrol: (input: { name: string; email: string; courseId: number }) => DemoLearner
  recordPayment: (id: string) => void
}
const Context = createContext<WorkspaceState | null>(null)

export function WorkspaceStateProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState(initialLearners)
  const [invoices, setInvoices] = useState(initialInvoices)
  function enrol(input: { name: string; email: string; courseId: number }) {
    const result = createDemoEnrolment(input, learners)
    setLearners(previous => [result.learner, ...previous])
    setInvoices(previous => [result.invoice, ...previous])
    return result.learner
  }
  function recordPayment(id: string) {
    setInvoices(previous => previous.map(item => item.id === id && item.status === 'pending' ? { ...item, status: 'paid' } : item))
  }
  return <Context.Provider value={{ learners, invoices, enrol, recordPayment }}>{children}</Context.Provider>
}

export function useWorkspace() {
  const state = useContext(Context)
  if (!state) throw new Error('WorkspaceStateProvider is required')
  return state
}
