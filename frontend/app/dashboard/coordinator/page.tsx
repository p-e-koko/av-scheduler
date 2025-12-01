"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Plus,
  Edit,
  Trash2,
  Menu,
  X,
  ClipboardList,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"

import { 
  authAPI,
  getStoredUser,
  formatAPIError,
  hasAnyRole,
  type User,
  userAPI,
  assignmentAPI,
  availabilityAPI,
  positionAPI,
  type Assignment,
  type Availability,
  type Position,
  type AssignmentsQueryParams,
  type UsersQueryParams
} from "@/lib/api"

function CoordinatorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"assignments" | "students" | "schedules" | "positions">("assignments")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Student View State
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [studentPagination, setStudentPagination] = useState<any>(null)
  const [studentCurrentPage, setStudentCurrentPage] = useState(1)

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [assignmentStats, setAssignmentStats] = useState({
    active: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  })

  // Check authentication and permissions
  useEffect(() => {
    const user = getStoredUser()
    if (!user) {
      router.push('/login')
      return
    }
    
    if (!hasAnyRole(['coordinator', 'admin'])) {
      router.push('/login')
      return
    }
    
    setCurrentUser(user)
    setLoading(false)
  }, [])

  // Fetch data function
  const fetchData = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      setError(null)

      switch (activeTab) {
        case 'assignments':
          const assignmentsResponse = await assignmentAPI.getAssignments({ per_page: 50 })
          setAssignments(assignmentsResponse.data)
          
          // Calculate stats
          const stats = assignmentsResponse.data.reduce((acc, assignment) => {
            switch (assignment.status) {
              case 'confirmed':
                acc.active++
                break
              case 'complete':
                acc.completed++
                break
              case 'pending':
                acc.pending++
                break
              default:
                break
            }
            
            // Check if overdue (past end time and not complete)
            const endDate = new Date(assignment.event_end_datetime)
            if (endDate < new Date() && assignment.status !== 'complete') {
              acc.overdue++
            }
            
            return acc
          }, { active: 0, completed: 0, pending: 0, overdue: 0 })
          
          setAssignmentStats(stats)
          break

        case 'students':
          const studentsResponse = await userAPI.getUsers({ 
            role: 'student', 
            per_page: 12,
            page: studentCurrentPage,
            search: studentSearchQuery || undefined
          })
          setStudents(studentsResponse.data)
          setStudentPagination(studentsResponse.meta)
          break

        case 'schedules':
          const availabilityResponse = await availabilityAPI.getAvailability({ per_page: 100 })
          setAvailability(availabilityResponse.data)
          break

        case 'positions':
          const positionsResponse = await positionAPI.getPositions()
          setPositions(positionsResponse.data)
          break
      }
    } catch (err) {
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  // Initial load and tab change
  useEffect(() => {
    fetchData()
  }, [currentUser, activeTab])

  // Student pagination change
  useEffect(() => {
    if (activeTab === 'students') {
      fetchData()
    }
  }, [studentCurrentPage])

  // Student search debounce
  useEffect(() => {
    if (activeTab === 'students') {
      const timeout = setTimeout(() => {
        if (studentCurrentPage !== 1) {
          setStudentCurrentPage(1)
        } else {
          fetchData()
        }
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [studentSearchQuery])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white/80 backdrop-blur-xl border-r border-gray-300/30 shadow-lg shadow-gray-100/50 h-full flex flex-col">
          {/* Sidebar Header - App Branding */}
          <div className="bg-gradient-to-r from-primary to-primary-medium text-white border-0 p-4">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-lg">AV Scheduler</h1>
                    <p className="text-xs text-white/80">Coordinator Dashboard</p>
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 p-2">
            <nav className="space-y-1">
              <div 
                onClick={() => setActiveTab("assignments")}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                  activeTab === "assignments" 
                    ? 'text-primary bg-primary/10 border-primary/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors ${
                  activeTab === "assignments" ? 'border' : ''
                }`}
              >
                <ClipboardList className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">Assignment Management</span>}
              </div>
              <div 
                onClick={() => setActiveTab("students")}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                  activeTab === "students" 
                    ? 'text-primary bg-primary/10 border-primary/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors ${
                  activeTab === "students" ? 'border' : ''
                }`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">View Students</span>}
              </div>
              <div 
                onClick={() => setActiveTab("schedules")}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                  activeTab === "schedules" 
                    ? 'text-primary bg-primary/10 border-primary/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors ${
                  activeTab === "schedules" ? 'border' : ''
                }`}
              >
                <Clock className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">Student Schedule</span>}
              </div>
              <div 
                onClick={() => setActiveTab("positions")}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                  activeTab === "positions" 
                    ? 'text-primary bg-primary/10 border-primary/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors ${
                  activeTab === "positions" ? 'border' : ''
                }`}
              >
                <MapPin className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">Position Management</span>}
              </div>
            </nav>
          </div>

          {/* Sidebar Footer - Current User */}
          <div className="p-4 border-t border-gray-200/30">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={currentUser.profile_picture_url || ""} />
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {sidebarCollapsed && (
              <div className="mt-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-gray-300/30 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {activeTab === "assignments" && "Assignment Management"}
                {activeTab === "students" && "View Students"}
                {activeTab === "schedules" && "Student Schedule"}
                {activeTab === "positions" && "Position Management"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === "assignments" && "Create and manage assignments for students"}
                {activeTab === "students" && "View and manage student information"}
                {activeTab === "schedules" && "Manage availability for all students"}
                {activeTab === "positions" && "Manage available positions and roles"}
              </p>
            </div>
            <Button 
              className="bg-gradient-to-r from-primary to-primary-medium text-white hover:shadow-lg transition-all"
              onClick={() => router.push('/student')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === "assignments" && "Add Assignment"}
              {activeTab === "students" && "View All Students"}
              {activeTab === "schedules" && "Add Schedule"}
              {activeTab === "positions" && "Add Position"}
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Assignment Management Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                        <p className="text-2xl font-bold text-primary">{assignmentStats.active}</p>
                      </div>
                      <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{assignmentStats.completed}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-orange-600">{assignmentStats.pending}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-red-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{assignmentStats.overdue}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-300/30 overflow-hidden">
                <div className="p-6 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Assignments</h3>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search assignments..."
                          className="pl-10 w-64 bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading assignments...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                  ) : (
                    <div className="space-y-4">
                      {(assignments || []).slice(0, 5).map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{assignment.assignment_name}</h4>
                              <p className="text-sm text-gray-600">{assignment.event_name} • {new Date(assignment.event_start_datetime).toLocaleDateString('en-US')}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-2 py-0.5 ${
                                assignment.status === 'complete' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                                'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {assignment.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {assignments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No assignments found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex items-center justify-between mb-6">
                {/* View Toggle */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30">
                    <Button
                      variant={viewMode === "card" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("card")}
                      className={viewMode === "card" ? "bg-primary text-white" : "text-gray-700 hover:text-gray-900"}
                    >
                      <Grid3X3 className="w-4 h-4 mr-1" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-primary text-white" : "text-gray-700 hover:text-gray-900"}
                    >
                      <List className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading students...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : (
                <>
                  {viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(students || []).map((student) => (
                        <Card 
                          key={student.id} 
                          className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer h-32"
                          onClick={() => router.push(`/student/${student.id}`)}
                        >
                          <CardContent className="p-4 h-full">
                            <div className="flex items-center space-x-4 h-full">
                              <Avatar className="h-16 w-16 flex-shrink-0">
                                <AvatarImage src={student.profile_picture_url || ""} />
                                <AvatarFallback className="bg-primary text-white font-semibold text-lg">
                                  {getInitials(student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm truncate">{student.name}</h3>
                                  <p className="text-xs text-gray-600 truncate">Student ID: {student.student_id || 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">Student</Badge>
                                  <Badge variant="hours" className="text-xs px-2 py-0.5">{student.promised_hours_per_week || '0'}h/week</Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-300/30 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Hours
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Email
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/50">
                            {(students || []).map((student) => (
                              <tr 
                                key={student.id} 
                                className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                                onClick={() => router.push(`/student/${student.id}`)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={student.profile_picture_url || ""} />
                                      <AvatarFallback className="bg-primary text-white font-semibold">
                                        {getInitials(student.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                      <div className="text-sm text-gray-600">{student.student_id || 'No Student ID'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="secondary" className="text-xs">
                                    Student
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="hours" className="text-xs">
                                    {student.promised_hours_per_week || '0'}h/week
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {student.email}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {studentPagination && studentPagination.last_page > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing {studentPagination.from} to {studentPagination.to} of {studentPagination.total} results
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={studentCurrentPage === 1}
                          onClick={() => setStudentCurrentPage(studentCurrentPage - 1)}
                          className="bg-white/80 backdrop-blur-xl border-gray-300/30"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {studentCurrentPage} of {studentPagination.last_page}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={studentCurrentPage === studentPagination.last_page}
                          onClick={() => setStudentCurrentPage(studentCurrentPage + 1)}
                          className="bg-white/80 backdrop-blur-xl border-gray-300/30"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {students.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">No students found</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Schedules Tab */}
          {activeTab === "schedules" && (
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Student Availability Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      <div className="font-semibold text-gray-600">Mon</div>
                      <div className="font-semibold text-gray-600">Tue</div>
                      <div className="font-semibold text-gray-600">Wed</div>
                      <div className="font-semibold text-gray-600">Thu</div>
                      <div className="font-semibold text-gray-600">Fri</div>
                      <div className="font-semibold text-gray-600">Sat</div>
                      <div className="font-semibold text-gray-600">Sun</div>
                    </div>
                    <div className="text-center py-12 text-gray-500">
                      Calendar view for student schedules will be implemented here
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Positions Tab */}
          {activeTab === "positions" && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading positions...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(positions || []).map((position) => (
                    <Card key={position.id} className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{position.name}</h3>
                              <p className="text-sm text-gray-600">{position.description || 'No description'}</p>
                            </div>
                          </div>
                          <Badge variant={position.is_active ? "secondary" : "outline"}>
                            {position.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(positions || []).length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">No positions found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ProtectedCoordinatorDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['coordinator', 'admin']}>
      <CoordinatorDashboard />
    </RoleProtectedRoute>
  )
}
