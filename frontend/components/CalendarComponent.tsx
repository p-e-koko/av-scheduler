import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  onViewChange?: (view: "month" | "week" | "day") => void
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  className?: string
  isMobile?: boolean
}

export function CalendarComponent({
  events = [],
  view = "month",
  onViewChange,
  onEventClick,
  onDateClick,
  className,
  isMobile = false
}: CalendarComponentProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
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
    startDate.setDate(startDate.getDate() - (startDate.getDay() + 6) % 7)
    endDate.setDate(endDate.getDate() + (7 - endDate.getDay()) % 7)

    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7)
    
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
      const weekStart = new Date(currentDate)
      weekStart.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    
    return currentDate.toLocaleDateString('en-US', options)
  }

  const renderMonthView = () => {
    const days = getMonthDays()
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className={`grid grid-cols-7 gap-1 ${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-600`}>
          {dayNames.map(day => (
            <div key={day} className="text-center p-2">{day}</div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === new Date().toDateString()
            
            return (
              <div
                key={index}
                onClick={() => onDateClick?.(day)}
                className={cn(
                  "border rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                  isMobile ? "min-h-[60px] p-1" : "min-h-[100px] p-2",
                  !isCurrentMonth && "text-gray-400 bg-gray-50/50",
                  isToday && "bg-blue-50 border-blue-200"
                )}
              >
                <div className={cn(
                  "font-semibold",
                  isMobile ? "text-xs" : "text-sm",
                  isToday && "text-blue-600"
                )}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, isMobile ? 1 : 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={cn(
                        "text-xs px-1 py-0.5 rounded truncate",
                        event.color || "bg-blue-100 text-blue-800"
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > (isMobile ? 1 : 3) && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - (isMobile ? 1 : 3)} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const days = getWeekDays()
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return (
      <div className="space-y-2">
        <div className={`grid grid-cols-7 gap-2 ${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-600`}>
          {days.map((day, index) => (
            <div key={index} className="text-center">
              <div>{dayNames[index]}</div>
              <div className={cn(
                "mt-1 rounded-full w-8 h-8 flex items-center justify-center mx-auto",
                day.toDateString() === new Date().toDateString() && "bg-blue-600 text-white"
              )}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            
            return (
              <div
                key={index}
                onClick={() => onDateClick?.(day)}
                className={cn(
                  "border rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                  isMobile ? "min-h-[120px] p-2" : "min-h-[200px] p-3"
                )}
              >
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded cursor-pointer",
                        event.color || "bg-blue-100 text-blue-800"
                      )}
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="opacity-75">
                        {event.start.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
        </div>
        
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events scheduled for this day
            </div>
          ) : (
            dayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50",
                  event.color || "bg-blue-50 border-blue-200"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">
                      {event.start.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })} - {event.end.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    )}
                  </div>
                  {event.type && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {event.type}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const navigate = getNavigationHandler()

  return (
    <Card className={cn("bg-white/90 backdrop-blur-xl border-0 shadow-lg", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-4">
            <span>{formatDateHeader()}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {onViewChange && !isMobile && (
              <div className="flex items-center bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30 mr-2">
                <Button
                  variant={view === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange("month")}
                  className="text-xs"
                >
                  Month
                </Button>
                <Button
                  variant={view === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange("week")}
                  className="text-xs"
                >
                  Week
                </Button>
                <Button
                  variant={view === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange("day")}
                  className="text-xs"
                >
                  Day
                </Button>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </CardContent>
    </Card>
  )
}