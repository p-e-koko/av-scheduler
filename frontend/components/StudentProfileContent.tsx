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
  User
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
  type Availability
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
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<UserType>>({})
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel for better performance
        const [studentResponse, assignmentsResponse, availabilityResponse] = await Promise.all([
          userAPI.getUser(studentId),
          assignmentAPI.getAssignments({ per_page: 50 }),
          availabilityAPI.getAvailability({ student_id: studentId, per_page: 50 })
        ])

        if (studentResponse.user.role !== 'student') {
          setError('User is not a student')
          return
        }

        setStudent(studentResponse.user)
        setEditData(studentResponse.user)

        // Filter assignments for this specific student
        const studentAssignments = assignmentsResponse.data.filter(assignment =>
          assignment.users?.some(user => user.id === studentId)
        )
        setAssignments(studentAssignments)
        setAvailability(availabilityResponse.data)

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const calendarEvents = React.useMemo(() => {
    return availability.map(slot => {
      const dateStr = slot.date.split('T')[0]
      const startDateTime = new Date(`${dateStr}T${slot.start_time}`)
      const endDateTime = new Date(`${dateStr}T${slot.end_time}`)

      let color = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      let title = "Available"

      if (slot.status === 'unavailable') {
        color = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
        title = "Unavailable"
      } else if (slot.status === 'class') {
        color = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-white dark:border-blue-800"
        title = "Class"
      }

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

  const handleSaveEdit = async () => {
    try {
      const updatedStudent = await userAPI.updateUser(studentId, editData)
      setStudent(updatedStudent.user)
      setIsEditing(false)
    } catch (err) {
      setError(formatAPIError(err))
    }
  }

  const cancelEdit = () => {
    setEditData(student || {})
    setIsEditing(false)
  }

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

          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-primary hover:bg-primary/90 w-full md:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2 w-full md:w-auto">
              <Button
                onClick={handleSaveEdit}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex-1 md:flex-none"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1 md:flex-none"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 mx-auto">
                      <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {!isEditing ? (
                    <>
                      <h3 className="text-xl font-semibold text-foreground mt-4">{student.name}</h3>
                      <p className="text-muted-foreground">{student.email}</p>
                      {student.student_id && (
                        <p className="text-sm text-muted-foreground mt-1">ID: {student.student_id}</p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3 mt-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                          id="student_id"
                          value={editData.student_id || ''}
                          onChange={(e) => setEditData({ ...editData, student_id: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active Student</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="secondary">Student</Badge>
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Promised Hours/Week</span>
                      <span className="font-medium text-foreground">{student.promised_hours_per_week || '0'}h</span>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="hours">Promised Hours/Week</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={editData.promised_hours_per_week || ''}
                        onChange={(e) => setEditData({ ...editData, promised_hours_per_week: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assignments & Availability */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability Schedule */}
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
                  view="day"
                  className="border-0 shadow-none h-[400px]"
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
