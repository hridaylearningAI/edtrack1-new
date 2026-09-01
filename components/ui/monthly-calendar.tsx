"use client"

import * as React from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns"
import { ChevronLeft, ChevronRight, Clipboard, Bell, User, GraduationCap, FlaskConical, Code, RefreshCw, Calendar as CalendarIcon, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  id: string
  title: string
  course: string
  date: Date
  time: string
  type: 'assessment' | 'due_soon' | 'in_progress' | 'workshop' | 'lecture' | 'lab' | 'exam'
  isWeekly?: boolean
  color?: 'orange' | 'purple' | 'dark-grey' | 'teal' | 'blue'
  /** Teams / meet link when set for this timetable row (DB-backed schedule). */
  meeting_link?: string | null
  /** Post-session recording URL (optional). */
  recording_link?: string | null
}

interface MonthlyCalendarProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  events: CalendarEvent[]
  onDateClick?: (date: Date) => void
  /** Full month grid (default) or a single week row containing `currentMonth`. */
  viewMode?: "month" | "week"
  /** Omit legend (e.g. compact dashboard). */
  hideLegend?: boolean
}

const eventTypeColors: Record<CalendarEvent['type'], string> = {
  assessment: 'bg-blue-100 border-blue-200 text-blue-900',
  due_soon: 'bg-orange-100 border-orange-200 text-orange-900',
  in_progress: 'bg-purple-100 border-purple-200 text-purple-900',
  workshop: 'bg-gray-100 border-gray-200 text-gray-900',
  lecture: 'bg-teal-100 border-teal-200 text-teal-900',
  lab: 'bg-green-100 border-green-200 text-green-900',
  exam: 'bg-red-100 border-red-200 text-red-900',
}

const eventTypeIcons: Record<CalendarEvent['type'], React.ComponentType<{ className?: string }>> = {
  assessment: Clipboard,
  due_soon: Bell,
  in_progress: Code,
  workshop: GraduationCap,
  lecture: User,
  lab: FlaskConical,
  exam: Clipboard,
}

// Fallback icon if type is not found
const DefaultIcon = Clipboard

/** Short preview for the day-cell header (replaces "N events" badge). */
function truncateText(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`
}

function dayCellTitlePreview(events: CalendarEvent[]): { label: string; fullTitle: string } {
  if (events.length === 0) return { label: "", fullTitle: "" }
  const fullTitle = events.map((e) => e.title).join(" · ")
  if (events.length === 1) {
    return { label: truncateText(events[0].title, 34), fullTitle }
  }
  return {
    label: `${truncateText(events[0].title, 24)} (+${events.length - 1})`,
    fullTitle,
  }
}

const getEventColor = (event: CalendarEvent): string => {
  if (event.color) {
    const colorMap: Record<string, string> = {
      orange: 'bg-orange-100 border-orange-200 text-orange-900',
      purple: 'bg-purple-100 border-purple-200 text-purple-900',
      'dark-grey': 'bg-gray-100 border-gray-200 text-gray-900',
      teal: 'bg-teal-100 border-teal-200 text-teal-900',
      blue: 'bg-blue-100 border-blue-200 text-blue-900',
    }
    return colorMap[event.color] || eventTypeColors[event.type]
  }
  return eventTypeColors[event.type]
}

export function MonthlyCalendar({
  currentMonth,
  onMonthChange,
  events,
  onDateClick,
  viewMode = "month",
  hideLegend = false,
}: MonthlyCalendarProps) {
  const isWeek = viewMode === "week"

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = isWeek
    ? startOfWeek(currentMonth, { weekStartsOn: 0 })
    : startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = isWeek
    ? endOfWeek(currentMonth, { weekStartsOn: 0 })
    : endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const goToPrevious = () => {
    onMonthChange(isWeek ? subWeeks(currentMonth, 1) : subMonths(currentMonth, 1))
  }

  const goToNext = () => {
    onMonthChange(isWeek ? addWeeks(currentMonth, 1) : addMonths(currentMonth, 1))
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function renderDayEventsBlock(
    day: Date,
    dayEvents: CalendarEvent[],
    isCurrentMonth: boolean,
    isCompactWeekRow: boolean
  ) {
    const hasEvents = dayEvents.length > 0
    const maxEventChips = isCompactWeekRow ? 4 : 2

    return (
      <div className={cn("space-y-1", !isCompactWeekRow && "mt-1")}>
        {hasEvents ? (
          dayEvents.slice(0, maxEventChips).map((event) => {
            const EventIcon = eventTypeIcons[event.type] || DefaultIcon
            const colorClass = getEventColor(event)

            if (!EventIcon || typeof EventIcon !== "function") {
              return null
            }

            return (
              <div
                key={event.id}
                className={cn(
                  "p-1.5 rounded text-xs border cursor-pointer hover:opacity-80 transition-opacity",
                  colorClass
                )}
                title={`${event.title} - ${event.course} - ${event.time}`}
              >
                <div className="flex items-start gap-1 mb-0.5 min-w-0">
                  <EventIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium min-w-0 flex-1 text-[11px] leading-tight line-clamp-2 break-words">
                    {event.title}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 truncate mb-0.5 min-w-0">{event.course}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] opacity-80">{event.time}</span>
                  {event.isWeekly && (
                    <div className="flex items-center gap-0.5">
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span className="text-[10px]">Weekly</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : isCurrentMonth && day.getDate() === 13 ? (
          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>No events today!</span>
          </div>
        ) : isCurrentMonth ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>Free day</span>
          </div>
        ) : null}

        {dayEvents.length > maxEventChips && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            +{dayEvents.length - maxEventChips} more
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={goToPrevious}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          aria-label={isWeek ? "Previous week" : "Previous month"}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-lg font-semibold sm:text-2xl">
          {isWeek
            ? `${format(calendarStart, "MMM d")} – ${format(calendarEnd, "MMM d, yyyy")}`
            : format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={goToNext}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          aria-label={isWeek ? "Next week" : "Next month"}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {!isWeek && (
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>
        )}

        <div className={cn(isWeek ? "flex flex-col" : "grid grid-cols-7")}>
          {days.map((day) => {
            const dayEvents = getEventsForDate(day)
            const titlePreview = dayCellTitlePreview(dayEvents)
            const isCurrentMonth = isWeek ? true : isSameMonth(day, currentMonth)
            const isCurrentDay = isToday(day)
            const hasEvents = dayEvents.length > 0

            if (isWeek) {
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "flex gap-3 border-b border-border/80 p-3 last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors sm:gap-4",
                    isCurrentDay && "bg-blue-50/60 dark:bg-blue-950/25"
                  )}
                  onClick={() => onDateClick?.(day)}
                >
                  <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-start border-r border-border/60 pr-3 text-center sm:w-16">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(day, "EEE")}
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold tabular-nums leading-tight",
                        isCurrentDay ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {hasEvents && (
                      <p
                        className="mb-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 line-clamp-2 break-words"
                        title={titlePreview.fullTitle}
                      >
                        {titlePreview.label}
                      </p>
                    )}
                    {renderDayEventsBlock(day, dayEvents, isCurrentMonth, true)}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[140px] border-r border-b last:border-r-0 p-2 cursor-pointer hover:bg-muted/50 transition-colors",
                  !isCurrentMonth && "bg-muted/20",
                  isCurrentDay && "bg-blue-50/50"
                )}
                onClick={() => onDateClick?.(day)}
              >
                <div className="flex items-start justify-between gap-1 mb-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-medium shrink-0",
                      !isCurrentMonth && "text-muted-foreground",
                      isCurrentDay && "text-blue-600 font-bold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hasEvents && (
                    <span
                      className="text-[10px] font-medium text-blue-700 dark:text-blue-300 leading-tight text-right min-w-0 flex-1 line-clamp-2 break-words"
                      title={titlePreview.fullTitle}
                    >
                      {titlePreview.label}
                    </span>
                  )}
                </div>
                {renderDayEventsBlock(day, dayEvents, isCurrentMonth, false)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {!hideLegend && (
      <div className="mt-6 p-4 border rounded-lg bg-muted/30">
        <h3 className="text-sm font-semibold mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Assessments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Due Soon
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <span className="text-xs flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              Workshops
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            <span className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              Lectures
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              Labs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs flex items-center gap-1">
              <Clipboard className="h-3 w-3" />
              Exams
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
