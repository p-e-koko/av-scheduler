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
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"

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
  
  // Calendar state
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month")

  // Search states
  const [studentSearchQuery, setStudentSearchQuery] = useState("")

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

        // Always fetch students and assignments as they are used across tabs or for stats
        const [studentsResponse, assignmentsResponse, availabilityResponse] = await Promise.all([
            userAPI.getUsers({ role: 'student', per_page: 100 }),
            assignmentAPI.getAssignments({ per_page: 100 }),
            availabilityAPI.getAvailability({ per_page: 100 })
        ]);

        setStudents(studentsResponse.data)
        setAssignments(assignmentsResponse.data)
        setAvailability(availabilityResponse.data)

        // Calculate Dashboard Stats
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

        // Calculate Assignment Stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const assignmentStatsCalc = assignmentsResponse.data.reduce((acc, assignment) => {
            const startDate = new Date(assignment.event_start_datetime)
            
            if (assignment.status === 'confirmed' || assignment.status === 'pending') acc.active++
            
            if (assignment.status === 'complete' && 
                startDate >= today && startDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
            acc.completedToday++
            }
            
            if (startDate > new Date()) acc.upcoming++
            
            return acc
        }, { active: 0, completedToday: 0, upcoming: 0 })
        
        setAssignmentStats(assignmentStatsCalc)

      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser]) // Fetch once on load/user change, not on tab change to avoid flickering

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Calculate Monthly Data from Assignments
  const calculateMonthlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const data = new Array(12).fill(0);

    assignments.forEach(assignment => {
        const date = new Date(assignment.event_start_datetime);
        if (date.getFullYear() === currentYear && assignment.status === 'complete') {
            const duration = (new Date(assignment.event_end_datetime).getTime() - date.getTime()) / (1000 * 60 * 60);
            data[date.getMonth()] += duration;
        }
    });

    return months.map((month, index) => ({
        month,
        hours: Math.round(data[index])
    }));
  };

  const monthlyData = calculateMonthlyData();
  const maxHours = Math.max(...monthlyData.map(d => d.hours), 10); // Default to 10 to avoid div by zero

  // Filter students
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Helper to get student assignments count
  const getStudentAssignmentCount = (studentId: string) => {
      return assignments.filter(a => a.users?.some(u => u.id === studentId) && a.status !== 'complete').length;
  };

  // Helper to get student availability string
  const getStudentAvailability = (studentId: string) => {
      const studentAvail = availability.filter(a => a.student_id === studentId);
      if (studentAvail.length === 0) return "No availability set";
      // Just show count or first available day for brevity
      return `${studentAvail.length} slots available`;
  };



  // Prepare calendar events
  const calendarEvents: CalendarEvent[] = assignments.map(assignment => {
    let colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-500";
    
    if (assignment.status === 'confirmed') {
      colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-500";
    } else if (assignment.status === 'pending') {
      colorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-500";
    } else if (assignment.status === 'complete') {
      colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-500";
    }

    return {
      id: assignment.id.toString(),
      title: assignment.assignment_name,
      start: new Date(assignment.event_start_datetime),
      end: new Date(assignment.event_end_datetime),
      type: assignment.status,
      color: colorClass,
      description: assignment.description
    };
  });

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
              <ModeToggle />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Key Metrics - Compact View */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{stats.totalStudents} Students</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">{Math.round(stats.monthlyHours)}h This Month</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium">{stats.averageHours.toFixed(1)}h Avg/Week</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{Math.round(stats.completionRate)}% Completion</span>
                </div>
              </div>

              {/* Monthly Hours Chart */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Completed Assignment Hours - {new Date().getFullYear()} Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <div className="flex items-end justify-between h-64 space-x-2">
                      {monthlyData.map((data, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-md min-h-[4px] flex items-end justify-center text-white text-xs font-semibold transition-all duration-500"
                            style={{ height: `${(data.hours / maxHours) * 100}%` }}
                          >
                            {data.hours > 0 && <span className="pb-2">{data.hours}h</span>}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">{data.month}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing completed assignment hours per month</span>
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
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Students Schedule Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredStudents.map((student) => {
                    const activeAssignments = getStudentAssignmentCount(student.id);
                    const availabilityText = getStudentAvailability(student.id);
                    
                    return (
                  <Card key={student.id} className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={student.profile_picture_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-foreground">{student.name}</h3>
                            <p className="text-sm text-muted-foreground">{availabilityText}</p>
                            <p className="text-xs text-muted-foreground mt-1">{activeAssignments} active assignments</p>
                          </div>
                        </div>
                        <Badge variant={activeAssignments > 0 ? "default" : "secondary"}>
                          {activeAssignments > 0 ? "Active" : "Idle"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )})}
                {filteredStudents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No students found matching your search.
                    </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Schedules Tab */}
          {activeTab === "assignment-schedules" && (
            <div className="space-y-6">
              {/* Assignment Overview Stats - Compact View */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{assignmentStats.active} Active</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">{assignmentStats.completedToday} Completed Today</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium">{assignmentStats.upcoming} Upcoming</span>
                </div>
              </div>

              {/* Assignment Timeline */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Upcoming Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments
                        .filter(a => new Date(a.event_start_datetime) >= new Date())
                        .sort((a, b) => new Date(a.event_start_datetime).getTime() - new Date(b.event_start_datetime).getTime())
                        .slice(0, 5)
                        .map((assignment, index) => (
                      <div key={assignment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-l-4 border-purple-500 dark:border-purple-400">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <ClipboardList className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{assignment.assignment_name}</h4>
                            <p className="text-sm text-muted-foreground">
                                {assignment.users && assignment.users.length > 0 
                                    ? `Assigned to: ${assignment.users.map(u => u.name).join(', ')}`
                                    : 'Unassigned'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(assignment.event_start_datetime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs px-2 py-1 ${
                            assignment.status === "pending" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                            assignment.status === "confirmed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                            "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}>
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {assignments.filter(a => new Date(a.event_start_datetime) >= new Date()).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">No upcoming assignments found.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Calendar View */}
              <div className="h-[700px]">
                <CalendarComponent 
                  events={calendarEvents}
                  view={calendarView}
                  onViewChange={setCalendarView}
                />
              </div>
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
