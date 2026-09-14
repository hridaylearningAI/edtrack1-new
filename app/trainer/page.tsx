"use client"

import Link from "next/link"
import TrainerLayout from "@/components/trainer/trainer-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, GraduationCap, Loader2, Clock, Brain, BookOpen } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function TrainerDashboardPage() {
  const { user, isAuthenticated, isLoading } = useUser()

  if (isLoading || !isAuthenticated || !user) {
    return (
      <TrainerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">Loading…</h2>
            <p className="text-muted-foreground">Opening your trainer dashboard</p>
          </div>
        </div>
      </TrainerLayout>
    )
  }

  const first = user.name?.split(" ")[0] ?? "Trainer"

  return (
    <TrainerLayout>
      <div className="space-y-6 w-full">
        {/* Enhanced Welcome Section (same pattern as admin/student dashboards) */}
        <div className="relative overflow-hidden w-full rounded-xl bg-gradient-to-br from-brand-blue/10 via-brand-red/5 to-brand-golden/10 p-4 sm:p-6 md:p-8 border-2 border-brand-blue/20 shadow-lg shadow-brand-blue/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-brand-blue mb-1">
                  {getGreeting()}, {first}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
                  Trainer Dashboard
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl break-words">
                  Manage your schedule and access NCLEX trainer tools when enabled for your account.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-white/50 backdrop-blur-sm">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-brand-blue/20 to-brand-golden/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        </div>

        {/* Quick Action Cards */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <Card className="relative overflow-hidden border-2 border-brand-blue/10 transition-shadow hover:shadow-md bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                <CardTitle className="text-lg">Schedule</CardTitle>
              </div>
              <CardDescription>View upcoming classes and availability.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trainer/schedule" className="text-sm font-medium text-brand-blue hover:underline">
                Open schedule →
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-brand-blue/10 transition-shadow hover:shadow-md bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-brand-blue" />
                <CardTitle className="text-lg">NCLEX Trainer</CardTitle>
              </div>
              <CardDescription>Respond to NCLEX forums and unlock/manage modules.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trainer/nclex" className="text-sm font-medium text-brand-blue hover:underline">
                Open NCLEX trainer →
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-brand-blue/10 transition-shadow hover:shadow-md bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-golden" />
                <CardTitle className="text-lg">NCLEX Course (Full)</CardTitle>
              </div>
              <CardDescription>Access the fully unlocked NCLEX course content.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trainer/nclex-course" className="text-sm font-medium text-brand-blue hover:underline">
                Open full course →
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-brand-blue/10 bg-white sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-golden" />
                <CardTitle className="text-lg">Your Role</CardTitle>
              </div>
              <CardDescription>
                You are signed in as a trainer. Your portal access is controlled by EdTec, so only enabled trainers can use
                the trainer features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </TrainerLayout>
  )
}
