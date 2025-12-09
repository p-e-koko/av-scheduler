"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  ClipboardList,
  Eye,
  Search,
  Filter,
  Menu
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { SupervisorSidebar } from "@/components/SupervisorSidebar"

import { 
  authAPI,
  getStoredUser,
  formatAPIError,
  hasAnyRole,
  type User,
  userAPI,
  assignmentAPI,
  availabilityAPI,
  type Assignment,
  type Availability
} from "@/lib/api"
import { ModeToggle } from "@/components/mode-toggle"

function SupervisorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "student-schedules" | "assignment-schedules">("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [students, setStudents] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    monthlyHours: 0,
    averageHours: 0,
    completionRate: 0
  })
  const [assignmentStats, setAssignmentStats] = useState({
    active: 0,
    completedToday: 0,
    upcoming: 0
  })

  // Check authentication and permissions
  useEffect(() => {
    const user = getStoredUser()
    if (!user) {
      router.push('/login')
      return
    }
    
    if (!hasAnyRole(['supervisor', 'admin'])) {
      router.push('/login')
      return
    }
    
    setCurrentUser(user)
    setLoading(false)
  }, [])

  // Fetch data based on active tab
  useEffect(() => {
    if (!currentUser) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        switch (activeTab) {
          case 'dashboard':
            // Fetch students and calculate stats
            const studentsResponse = await userAPI.getUsers({ role: 'student', per_page: 100 })
            setStudents(studentsResponse.data)
            
            const totalHours = studentsResponse.data.reduce((acc, student) => 
              acc + (student.hours_worked_this_week || 0), 0)
            const avgHours = studentsResponse.data.length > 0 ? 
              totalHours / studentsResponse.data.length : 0
            const completionSum = studentsResponse.data.reduce((acc, student) => 
              acc + (student.hours_completion_percentage || 0), 0)
            const avgCompletion = studentsResponse.data.length > 0 ?
              completionSum / studentsResponse.data.length : 0
            
            setStats({
              totalStudents: studentsResponse.data.length,
              monthlyHours: totalHours * 4, // Approximate monthly hours
              averageHours: avgHours,
              completionRate: avgCompletion
            })
            break

          case 'student-schedules':
            const availabilityResponse = await availabilityAPI.getAvailability({ per_page: 100 })
            setAvailability(availabilityResponse.data)
            break

          case 'assignment-schedules':
            const assignmentsResponse = await assignmentAPI.getAssignments({ per_page: 100 })
            setAssignments(assignmentsResponse.data)
            
            // Calculate assignment stats
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const assignmentStatsCalc = assignmentsResponse.data.reduce((acc, assignment) => {
              const startDate = new Date(assignment.event_start_datetime)
              const endDate = new Date(assignment.event_end_datetime)
              
              if (assignment.status === 'confirmed') acc.active++
              
              if (assignment.status === 'complete' && 
                  startDate >= today && startDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
                acc.completedToday++
              }
              
              if (startDate > new Date()) acc.upcoming++
              
              return acc
            }, { active: 0, completedToday: 0, upcoming: 0 })
            
            setAssignmentStats(assignmentStatsCalc)
            break
        }
      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser, activeTab])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Sample data for the bar chart
  const monthlyData = [
    { month: "Jan", hours: 156 },
    { month: "Feb", hours: 134 },
    { month: "Mar", hours: 189 },
    { month: "Apr", hours: 167 },
    { month: "May", hours: 198 },
    { month: "Jun", hours: 201 },
    { month: "Jul", hours: 145 },
    { month: "Aug", hours: 178 },
    { month: "Sep", hours: 156 },
    { month: "Oct", hours: 203 },
    { month: "Nov", hours: 187 },
    { month: "Dec", hours: 165 },
  ]

  const maxHours = Math.max(...monthlyData.map(d => d.hours))

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-background">
      <SupervisorSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card/70 backdrop-blur-xl border-b border-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {activeTab === "dashboard" && "Supervisor Dashboard"}
                {activeTab === "student-schedules" && "Student Schedule"}
                {activeTab === "assignment-schedules" && "Assignment Schedule"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "dashboard" && "Overview of student assignment hours and performance"}
                {activeTab === "student-schedules" && "View student availability and schedules"}
                {activeTab === "assignment-schedules" && "View assignment timelines and schedules"}
              </p>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-primary/10 text-primary">
                <Eye className="w-3 h-3 mr-1" />
                View Only
              </Badge>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold text-primary">{stats.totalStudents}</p>
                        <p className="text-xs text-muted-foreground mt-1">Active students</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(stats.monthlyHours)}h</p>
                        <p className="text-xs text-muted-foreground mt-1">Estimated monthly hours</p>
                      </div>
                      <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average Hours</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.averageHours.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground mt-1">per student/week</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold text-primary">{Math.round(stats.completionRate)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Average completion</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Hours Chart */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Student Assignment Hours - Monthly Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <div className="flex items-end justify-between h-64 space-x-2">
                      {monthlyData.map((data, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-md min-h-[4px] flex items-end justify-center text-white text-xs font-semibold"
                            style={{ height: `${(data.hours / maxHours) * 100}%` }}
                          >
                            <span className="pb-2">{data.hours}h</span>
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">{data.month}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing monthly assignment hours across all students</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-primary rounded"></div>
                        <span>Assignment Hours</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Top Performing Students This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading students...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-destructive">{error}</div>
                  ) : (
                    <div className="space-y-4">
                      {students
                        .sort((a, b) => (b.hours_completion_percentage || 0) - (a.hours_completion_percentage || 0))
                        .slice(0, 4)
                        .map((student, index) => (
                          <div 
                            key={student.id} 
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => router.push(`/student/${student.id}`)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-muted-foreground' : index === 2 ? 'bg-orange-500' : 'bg-muted-foreground/70'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">{student.name}</h4>
                                <p className="text-sm text-muted-foreground">{student.hours_worked_this_week || 0} hours completed</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                {student.hours_completion_percentage || 0}% completion
                              </Badge>
                            </div>
                          </div>
                        ))}
                      {students.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No students found</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Schedules Tab */}
          {activeTab === "student-schedules" && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      className="pl-10 w-64 bg-card/80 backdrop-blur-xl border-border focus:border-primary"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                </div>
              </div>

              {/* Students Schedule Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sample student schedule cards */}
                {[
                  { name: "John Doe", availability: "Mon-Fri 9AM-5PM", status: "Available", assignments: 3 },
                  { name: "Jane Smith", availability: "Tue-Sat 10AM-6PM", status: "Busy", assignments: 5 },
                  { name: "Mike Johnson", availability: "Mon-Wed 8AM-4PM", status: "Available", assignments: 2 },
                  { name: "Sarah Wilson", availability: "Thu-Sun 12PM-8PM", status: "Available", assignments: 4 },
                ].map((student, index) => (
                  <Card key={index} className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-foreground">{student.name}</h3>
                            <p className="text-sm text-muted-foreground">{student.availability}</p>
                            <p className="text-xs text-muted-foreground mt-1">{student.assignments} active assignments</p>
                          </div>
                        </div>
                        <Badge className={`${
                          student.status === "Available" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {student.status}
                        </Badge>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <div key={i} className="text-xs">
                              <div className="font-semibold text-muted-foreground">{day}</div>
                              <div className={`w-full h-4 rounded mt-1 ${
                                index % 2 === 0 
                                  ? (i < 5 ? 'bg-green-400 dark:bg-green-600' : 'bg-muted') 
                                  : (i > 0 && i < 6 ? 'bg-green-400 dark:bg-green-600' : 'bg-muted')
                              }`}></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Schedules Tab */}
          {activeTab === "assignment-schedules" && (
            <div className="space-y-6">
              {/* Assignment Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Assignments</p>
                        <p className="text-2xl font-bold text-primary">{assignmentStats.active}</p>
                      </div>
                      <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{assignmentStats.completedToday}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{assignmentStats.upcoming}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment Timeline */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Assignment Schedule Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        title: "Chapel Audio Setup", 
                        student: "John Doe", 
                        time: "Monday 9:00 AM - 11:00 AM", 
                        status: "In Progress",
                        type: "Audio"
                      },
                      { 
                        title: "Video Production - Event", 
                        student: "Jane Smith", 
                        time: "Tuesday 2:00 PM - 6:00 PM", 
                        status: "Scheduled",
                        type: "Video"
                      },
                      { 
                        title: "Lighting Setup - Conference", 
                        student: "Mike Johnson", 
                        time: "Wednesday 8:00 AM - 12:00 PM", 
                        status: "Scheduled",
                        type: "Lighting"
                      },
                      { 
                        title: "Live Stream Support", 
                        student: "Sarah Wilson", 
                        time: "Thursday 10:00 AM - 2:00 PM", 
                        status: "Pending",
                        type: "Streaming"
                      },
                    ].map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-l-4 border-purple-500 dark:border-purple-400">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <ClipboardList className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                            <p className="text-sm text-muted-foreground">Assigned to: {assignment.student}</p>
                            <p className="text-xs text-muted-foreground">{assignment.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            {assignment.type}
                          </Badge>
                          <Badge className={`text-xs px-2 py-1 ${
                            assignment.status === "In Progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                            assignment.status === "Scheduled" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                            "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}>
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Calendar View */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>This Week's Assignment Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                      <div key={index} className="space-y-2">
                        <div className="font-semibold text-muted-foreground text-sm">{day}</div>
                        <div className="min-h-24 p-2 bg-muted/50 rounded border border-border">
                          {index < 4 && (
                            <div className="text-xs p-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded mb-1">
                              {index === 0 && "Chapel Audio"}
                              {index === 1 && "Video Event"}
                              {index === 2 && "Lighting"}
                              {index === 3 && "Live Stream"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ProtectedSupervisorDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['supervisor', 'admin']}>
      <SupervisorDashboard />
    </RoleProtectedRoute>
  )
}
