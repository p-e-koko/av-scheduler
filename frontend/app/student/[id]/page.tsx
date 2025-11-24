"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  User, 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Activity,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"

import { 
  userAPI,
  assignmentAPI,
  availabilityAPI,
  formatAPIError,
  type User as UserType,
  type Assignment,
  type Availability
} from "@/lib/api"

function StudentProfile() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

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
          <Button onClick={() => router.back()} variant="outline">
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
          <Button onClick={() => router.back()} variant="outline">
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
              variant="outline"
              className="bg-white/80 backdrop-blur-xl border-gray-300/30"
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
                      <span className="font-medium">{student.promised_hours_per_week || '0'}h</span>
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

            {/* Statistics Card */}
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-primary" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Assignments</span>
                  <span className="font-semibold text-primary">{assignments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">
                    {assignments.filter(a => a.status === 'complete').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active</span>
                  <span className="font-semibold text-blue-600">
                    {assignments.filter(a => a.status === 'confirmed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Slots</span>
                  <span className="font-semibold text-orange-600">{availability.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assignments & Availability */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Assignments */}
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                  Recent Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.slice(0, 5).map((assignment) => (
                      <div key={assignment.id} className="p-4 bg-gray-50/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{assignment.assignment_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{assignment.event_name}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(assignment.event_start_datetime).toLocaleDateString()}
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(assignment.event_start_datetime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {assignment.event_location}
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No assignments found</p>
                )}
              </CardContent>
            </Card>

            {/* Availability Schedule */}
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Availability Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availability.length > 0 ? (
                  <div className="space-y-3">
                    {availability.slice(0, 5).map((slot) => (
                      <div key={slot.id} className="p-4 bg-gray-50/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-4">
                              <span className="font-medium text-gray-900">
                                {new Date(slot.date).toLocaleDateString('en-US', { 
                                  weekday: 'long',
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                              <span className="text-gray-600">
                                {slot.start_time} - {slot.end_time}
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(slot.status)}>
                            {slot.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No availability schedule found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProtectedStudentProfile() {
  return (
    <RoleProtectedRoute allowedRoles={['admin', 'coordinator', 'supervisor']}>
      <StudentProfile />
    </RoleProtectedRoute>
  )
}