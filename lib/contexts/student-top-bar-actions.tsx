"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface StudentTopBarActionsContextValue {
  actions: ReactNode
  setActions: (actions: ReactNode) => void
}

const StudentTopBarActionsContext = createContext<StudentTopBarActionsContextValue | null>(null)

export function StudentTopBarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null)
  return (
    <StudentTopBarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </StudentTopBarActionsContext.Provider>
  )
}

export function useStudentTopBarActions() {
  const ctx = useContext(StudentTopBarActionsContext)
  return ctx
}
