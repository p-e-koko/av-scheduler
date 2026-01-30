"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  AlertCircle,
  User,
  Phone
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"

import {
  userAPI,
  assignmentAPI,
  availabilityAPI,
  formatAPIError,
  type User as UserType,
  type Assignment,
  type Availability,
  getStoredUser
} from "@/lib/api"

interface StudentProfileContentProps {
  studentId: string;
}

export function StudentProfileContent({ studentId }: StudentProfileContentProps) {
  const router = useRouter()

  const [student, setStudent] = useState<UserType | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month")
  const [currentDate, setCurrentDate] = useState(new Date())

  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [phoneNumberInput, setPhoneNumberInput] = useState("")

  const fetchAvailabilityForRange = async (date: Date, view: "month" | "week" | "day") => {
    if (!studentId) return

    try {
      // Don't set global loading here to avoid full page spinner on calendar nav
      // But maybe we want a local loading indicator? For now, let's just fetch.
      // Or use the global loading if it's the first load?
      // let's use global loading if access is fast, or maybe separate loading state? 
      // Existing code uses `loading`. If I use it, it hides the whole profile.
      // Better to strictly use it only for initial load.

      let dateFrom = new Date(date)
      let dateTo = new Date(date)

      if (view === 'month') {
        dateFrom = new Date(date.getFullYear(), date.getMonth(), 1)
        dateFrom.setDate(dateFrom.getDate() - 7)
        dateTo = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        dateTo.setDate(dateTo.getDate() + 7)
      } else if (view === 'week') {
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        dateFrom.setDate(diff)
        dateTo.setDate(diff + 6)
      } else {
        dateFrom.setHours(0, 0, 0, 0)
        dateTo.setHours(23, 59, 59, 999)
      }

      const response = await availabilityAPI.getAvailability({
        student_id: studentId,
        per_page: 1000,
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0]
      })
      setAvailability(response.data)
    } catch (err) {
      console.error("Failed to fetch availability range", err)
      // Optional: show error toast/dialog instead of blocking page
    }
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch student data and initial assignments
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [studentResponse, assignmentsResponse] = await Promise.all([
          userAPI.getUser(studentId),
          assignmentAPI.getAssignments({ per_page: 50 })
        ])

        if (studentResponse.user.role !== 'student') {
          setError('User is not a student')
          return
        }

        setStudent(studentResponse.user)
        setPhoneNumberInput(studentResponse.user.phone_number || "")

        const studentAssignments = assignmentsResponse.data.filter(assignment =>
          assignment.users?.some(user => user.id === studentId)
        )
        setAssignments(studentAssignments)

      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  // Fetch availability when date/view/studentId changes
  useEffect(() => {
    fetchAvailabilityForRange(currentDate, calendarView)
  }, [currentDate, calendarView, studentId])

  const handleUpdatePhoneNumber = async () => {
    if (!student) return
    try {
      setLoading(true)
      // Call update API
      const formData = new FormData();
      formData.append('name', student.name);
      formData.append('email', student.email);
      formData.append('phone_number', phoneNumberInput);

      await userAPI.updateUser(student.id, formData);

      // Update local state
      setStudent(prev => prev ? ({ ...prev, phone_number: phoneNumberInput }) : null)
      setIsEditingPhone(false)
      setError(null)
    } catch (err: any) {
      console.error("Failed to update phone number", err)
      setError("Failed to update phone number")
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const calendarEvents = React.useMemo(() => {
    return availability
      .filter(slot => slot.status !== 'available') // Filter out "available" slots as we use default availability
      .map(slot => {
        const dateStr = slot.date.split('T')[0]
        const startDateTime = new Date(`${dateStr}T${slot.start_time}`)
        const endDateTime = new Date(`${dateStr}T${slot.end_time}`)

        let color = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
        let defaultTitle = "Available"

        if (slot.status === 'unavailable') {
          color = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
          defaultTitle = "Unavailable"
        } else if (slot.status === 'class') {
          color = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-white dark:border-blue-800"
          defaultTitle = "Class"
        }

        const title = slot.title || defaultTitle

        return {
          id: slot.id.toString(),
          title: title,
          start: startDateTime,
          end: endDateTime,
          type: slot.status,
          color: color,
          description: `${slot.start_time} - ${slot.end_time}`
        } as CalendarEvent
      })
  }, [availability])



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'class':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
      case 'busy':
      case 'unavailable':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Calculate hours data
  const hoursData = React.useMemo(() => {
    if (!student) return { promised: 0, worked: 0, remaining: 0, percentage: 0 }

    const promised = parseFloat(student.promised_hours_per_week || '0')

    // Get start and end of current week
    const now = new Date()
    const startOfWeek = new Date(now)
    const day = now.getDay() || 7 // Get current day number, converting Sun (0) to 7
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1)) // Set to Monday
    else startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const worked = assignments
      .filter(a => {
        const eventDate = new Date(a.event_start_datetime)
        return a.status === 'complete' && eventDate >= startOfWeek && eventDate <= endOfWeek
      })
      .reduce((acc, curr) => {
        const start = new Date(curr.event_start_datetime)
        const end = new Date(curr.event_end_datetime)
        return acc + Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

    const remaining = Math.max(0, promised - worked)
    const percentage = promised > 0 ? Math.min(100, (worked / promised) * 100) : 0

    return { promised, worked, remaining, percentage }
  }, [student, assignments])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Profile</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="ghost" className="text-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Student Not Found</h2>
          <p className="text-muted-foreground mb-4">The student profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()} variant="ghost" className="text-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 md:gap-0">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="bg-card/80 backdrop-blur-xl hover:bg-muted text-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Student Profile</h1>
              <p className="text-muted-foreground">Detailed view and management</p>
            </div>
          </div>


        </div>

        <div className="flex flex-col space-y-6">
          {/* Top Row - Profile Info */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="flex-shrink-0">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 w-full space-y-6">
                    <div className="space-y-2 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-foreground">{student.name}</h3>
                      <div className="flex flex-col md:flex-row gap-4 text-muted-foreground justify-center md:justify-start items-center md:items-center">
                        <p>{student.email}</p>
                        <span className="hidden md:inline">•</span>

                        {/* Phone Number Display & Edit */}
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {isEditingPhone ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={phoneNumberInput}
                                onChange={(e) => setPhoneNumberInput(e.target.value)}
                                className="h-7 px-2 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-32 md:w-40"
                                placeholder="Phone number"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleUpdatePhoneNumber}
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                title="Save"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setIsEditingPhone(false)
                                  setPhoneNumberInput(student.phone_number || "")
                                }}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>
                                {student.phone_number ? student.phone_number : <span className="italic opacity-70 text-xs">No phone</span>}
                              </span>
                              <button
                                onClick={() => setIsEditingPhone(true)}
                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-primary ${getStoredUser()?.role === 'admin' || getStoredUser()?.id === student.id ? '' : 'hidden'
                                  }`}
                                title="Edit Phone Number"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {student.student_id && (
                          <>
                            <span className="hidden md:inline">•</span>
                            <span>ID: {student.student_id}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                      <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Status</span>
                        <Badge className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active Student</Badge>
                      </div>
                      <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Role</span>
                        <Badge variant="secondary" className="w-fit">Student</Badge>
                      </div>
                      <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Promised Hours/Week</span>
                        <span className="text-lg font-semibold text-foreground">{student.promised_hours_per_week || '0'}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Availability Schedule */}
          <div className="space-y-6">
            <div className="bg-card/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold flex items-center text-foreground">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Availability Schedule
                </h3>
              </div>
              <div className="p-0">
                <CalendarComponent
                  events={calendarEvents}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  date={currentDate}
                  onDateChange={setCurrentDate}
                  className="border-0 shadow-none min-h-[600px]"
                  isMobile={isMobile}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
