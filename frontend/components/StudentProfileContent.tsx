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
      
      let color = "bg-blue-100 text-blue-800 border-blue-200"
      let title = "Available"
      
      if (slot.status === 'unavailable') {
        color = "bg-red-100 text-red-800 border-red-200"
        title = "Unavailable"
      } else if (slot.status === 'class') {
        color = "bg-yellow-100 text-yellow-800 border-yellow-200"
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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'available':
        return 'bg-blue-100 text-blue-800'
      case 'busy':
        return 'bg-red-100 text-red-800'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

    const remaining = Math.max(0, promised - worked)
    const percentage = promised > 0 ? Math.min(100, (worked / promised) * 100) : 0

    return { promised, worked, remaining, percentage }
  }, [student, assignments])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="ghost" className="text-gray-900 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-4">The student profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()} variant="ghost" className="text-gray-900 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.back()} 
              variant="ghost"
              className="bg-white/80 backdrop-blur-xl hover:bg-gray-100 text-gray-900 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Student Profile</h1>
              <p className="text-gray-600">Detailed view and management</p>
            </div>
          </div>
          
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-primary hover:bg-primary-dark"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                onClick={handleSaveEdit}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                onClick={cancelEdit}
                variant="outline"
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
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 mx-auto">
                      <AvatarImage src={student.profile_picture_url || ""} />
                      <AvatarFallback className="bg-primary text-white text-2xl font-semibold">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {!isEditing ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mt-4">{student.name}</h3>
                      <p className="text-gray-600">{student.email}</p>
                      {student.student_id && (
                        <p className="text-sm text-gray-500 mt-1">ID: {student.student_id}</p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3 mt-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={editData.name || ''}
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                          id="student_id"
                          value={editData.student_id || ''}
                          onChange={(e) => setEditData({...editData, student_id: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className="bg-green-100 text-green-800">Active Student</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Role</span>
                    <Badge variant="secondary">Student</Badge>
                  </div>
                  
                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Promised Hours/Week</span>
                      <span className="font-medium text-gray-900">{student.promised_hours_per_week || '0'}h</span>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="hours">Promised Hours/Week</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={editData.promised_hours_per_week || ''}
                        onChange={(e) => setEditData({...editData, promised_hours_per_week: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assignments & Availability */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hours Summary Card */}
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Clock className="w-5 h-5 mr-2 text-primary" />
                  Hours Summary (This Week)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Promised</p>
                      <p className="text-2xl font-bold text-blue-700">{hoursData.promised}h</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Worked</p>
                      <p className="text-2xl font-bold text-green-700">{hoursData.worked.toFixed(1)}h</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Remaining</p>
                      <p className="text-2xl font-bold text-orange-700">{hoursData.remaining.toFixed(1)}h</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress</span>
                      <span>{Math.round(hoursData.percentage)}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${hoursData.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability Schedule */}
            <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold flex items-center text-gray-900">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Availability Schedule
                </h3>
              </div>
              <div className="p-0">
                <CalendarComponent
                  events={calendarEvents}
                  view="day"
                  className="border-0 shadow-none h-[400px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
