import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type?: string
  color?: string
  description?: string
}

export interface CalendarComponentProps {
  events?: CalendarEvent[]
  view?: "month" | "week" | "day"
  date?: Date
  onViewChange?: (view: "month" | "week" | "day") => void
  onEventClick?: (event: CalendarEvent) => void
  onDateChange?: (date: Date) => void
  onDateClick?: (date: Date) => void
  className?: string
  isMobile?: boolean
}

export function CalendarComponent({
  events = [],
  view = "month",
  date,
  onViewChange,
  onEventClick,
  onDateChange,
  onDateClick,
  className,
  isMobile = false
}: CalendarComponentProps) {
  const [internalDate, setInternalDate] = React.useState(new Date())

  // Use controlled date if provided, otherwise internal state
  const currentDate = date || internalDate

  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate)
    } else {
      setInternalDate(newDate)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    handleDateChange(newDate)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    handleDateChange(newDate)
  }

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    handleDateChange(newDate)
  }

  const getNavigationHandler = () => {
    switch (view) {
      case "month": return navigateMonth
      case "week": return navigateWeek
      case "day": return navigateDay
      default: return navigateMonth
    }
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const endDate = new Date(lastDay)

    // Adjust to start from Monday
    const day = startDate.getDay()
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
    startDate.setDate(diff)

    const days = []
    const current = new Date(startDate)

    // Generate 42 days (6 weeks) to ensure consistent height
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long'
    }

    if (view === "day") {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    if (view === "week") {
      const days = getWeekDays()
      const start = days[0]
      const end = days[6]

      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getFullYear()}`
      }
      return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getFullYear()}`
    }

    return currentDate.toLocaleDateString('en-US', options)
  }

  const renderMonthView = () => {
    const days = getMonthDays()
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return (
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map(day => (
            <div key={day} className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l border-border">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === new Date().toDateString()

            const MAX_VISIBLE_EVENTS = 3;
            const hiddenEventsCount = dayEvents.length - MAX_VISIBLE_EVENTS;

            return (
              <div
                key={index}
                onClick={() => onDateClick?.(day)}
                className={cn(
                  "h-[120px] border-b border-r border-border p-1 transition-colors hover:bg-muted/50 cursor-pointer relative flex flex-col gap-1",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground"
                )}
              >
                <div className="flex justify-center mb-0.5 flex-shrink-0">
                  <span className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {day.getDate()}
                  </span>
                </div>

                <div className="space-y-1 overflow-hidden flex-1">
                  {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                        event.color || "bg-blue-100 text-blue-700"
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > MAX_VISIBLE_EVENTS && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          className="text-[10px] text-muted-foreground pl-1 font-medium hover:text-primary hover:underline mt-0.5 w-fit cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hiddenEventsCount} more...
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 z-50 p-2" align="start">
                        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                          <span>{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span className="text-[10px] font-normal border border-border px-1.5 py-0.5 rounded bg-muted/50">{dayEvents.length} Events</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-[300px] overflow-y-auto space-y-1 pt-1 pr-1">
                          {dayEvents.map(event => (
                            <DropdownMenuItem
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick?.(event)
                              }}
                              className={cn(
                                "flex flex-col items-start gap-0.5 cursor-pointer py-2 focus:bg-accent",
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", event.type === 'unavailable' ? 'bg-red-500' : event.type === 'class' ? 'bg-yellow-500' : 'bg-blue-500')} />
                                <span className="font-semibold text-xs truncate flex-1">{event.title}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground pl-4">
                                {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderTimeGrid = (days: Date[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="flex flex-col h-full overflow-y-auto relative scrollbar-hide">
        <div className="flex min-w-full">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 border-r border-border bg-card sticky left-0 z-10">
            <div className="h-10 border-b border-border"></div> {/* Header spacer */}
            {hours.map(hour => (
              <div key={hour} className="h-12 relative">
                <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className="flex-1 flex min-w-0">
            {days.map((day, dayIndex) => {
              const isToday = day.toDateString() === new Date().toDateString()
              const dayEvents = getEventsForDate(day)

              return (
                <div key={dayIndex} className="flex-1 min-w-[100px] border-r border-border relative">
                  {/* Day Header */}
                  <div className="h-10 border-b border-border flex flex-col items-center justify-center sticky top-0 bg-card z-10">
                    <span className={cn("text-xs font-medium uppercase", isToday ? "text-primary" : "text-muted-foreground")}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Time slots background */}
                  <div className="relative">
                    {hours.map(hour => (
                      <div key={hour} className="h-12 border-b border-border"></div>
                    ))}

                    {/* Events */}
                    {dayEvents.map(event => {
                      const startHour = event.start.getHours()
                      const startMin = event.start.getMinutes()
                      const endHour = event.end.getHours()
                      const endMin = event.end.getMinutes()

                      const top = (startHour * 48) + (startMin * 48 / 60) // 48px per hour (h-12 = 3rem = 48px)
                      const durationMinutes = ((endHour * 60) + endMin) - ((startHour * 60) + startMin)
                      const height = (durationMinutes * 48 / 60)

                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded px-2 py-1 text-xs cursor-pointer overflow-hidden border-l-4 shadow-sm hover:brightness-95 transition-all z-0",
                            event.color || "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-white dark:border-blue-500"
                          )}
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height, 20)}px` // Minimum height for visibility
                          }}
                        >
                          <div className="font-semibold truncate">{event.title}</div>
                          <div className="text-[10px] opacity-90 truncate">
                            {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -
                            {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const days = getWeekDays()
    return renderTimeGrid(days)
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

    const getEventColor = (event: CalendarEvent) => {
      if (event.type === 'unavailable') return "bg-red-500"
      if (event.type === 'class') return "bg-yellow-500"
      return "bg-blue-500" // default/available
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto bg-card">
        <div className="p-4">
          <div className="mb-6 flex items-center">
            {currentDate.toDateString() === new Date().toDateString() && (
              <span className="px-2 py-1 rounded bg-primary text-xs font-medium text-primary-foreground mr-2">
                Today
              </span>
            )}
            <span className="font-semibold text-foreground">
              {currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="space-y-1">
            {dayEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">No events scheduled</div>
            ) : (
              dayEvents.map(event => (
                <div
                  key={event.id}
                  className="flex group cursor-pointer hover:bg-muted/50 rounded-lg p-3 -mx-3 transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  {/* Time */}
                  <div className="w-14 flex-shrink-0 pt-1">
                    <div className="text-sm font-bold text-foreground">
                      {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false }).replace(/^0/, '')}
                    </div>
                  </div>

                  {/* Indicator & Content */}
                  <div className="flex-1 flex gap-3 relative">
                    {/* Vertical Color Bar */}
                    <div className={cn("w-1 rounded-full flex-shrink-0", getEventColor(event))} />

                    <div className="pb-1">
                      <h4 className="text-base font-medium text-foreground leading-tight">{event.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} -
                        {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  const navigate = getNavigationHandler()

  return (
    <Card className={cn("bg-card border shadow-sm overflow-hidden flex flex-col h-full", className)}>
      <CardHeader className="border-b border-border px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("prev")}
                className="h-7 w-7 p-0 hover:bg-card rounded-md"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateChange(new Date())}
                className="h-7 px-3 text-xs font-medium hover:bg-card text-foreground rounded-md"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("next")}
                className="h-7 w-7 p-0 hover:bg-card rounded-md"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </Button>
            </div>
            <CardTitle className="text-lg font-semibold text-foreground">
              {formatDateHeader()}
            </CardTitle>
          </div>

          {onViewChange && (
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("month")}
                className={cn(
                  "h-7 text-xs font-medium rounded-md px-3",
                  view === "month" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Month
              </Button>
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("week")}
                className={cn(
                  "h-7 text-xs font-medium rounded-md px-3",
                  view === "week" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Week
              </Button>
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("day")}
                className={cn(
                  "h-7 text-xs font-medium rounded-md px-3",
                  view === "day" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Day
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </CardContent>
    </Card>
  )
}