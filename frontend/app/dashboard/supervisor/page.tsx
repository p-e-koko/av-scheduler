"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Menu,
  MoreHorizontal,
  ChevronDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { SupervisorSidebar } from "@/components/SupervisorSidebar"
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"
import { AssignmentDetailModal } from "@/components/AssignmentDetailModal"
import { NotificationDropdown } from "@/components/NotificationDropdown"

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
import { initServerTime, getServerTime, getServerTodayResult } from "@/lib/server-time"
import { ModeToggle } from "@/components/mode-toggle"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function SupervisorDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "student-schedules" | "assignment-schedules">("dashboard")

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['dashboard', 'student-schedules', 'assignment-schedules'].includes(tab)) {
      setActiveTab(tab as any)
    }
  }, [searchParams])
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
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Availability View State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Initial render will use client time, but we'll try to sync quickly
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })

  // Search states
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check authentication and permissions
  useEffect(() => {
    const initializeDashboard = async () => {
      // Sync time first
      await initServerTime();

      // Update selected date to server time if it differs from client default
      // This ensures we show the correct "today" based on server time
      const serverToday = getServerTodayResult();
      const d = new Date();
      const clientToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (serverToday !== clientToday) {
        setSelectedDate(serverToday);
      }

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
    };

    initializeDashboard();
  }, [])

  // Fetch data based on active tab
  useEffect(() => {
    if (!currentUser) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Always fetch students and assignments as they are used across tabs or for stats
        const [studentsResponse, assignmentsResponse] = await Promise.all([
          userAPI.getUsers({ role: 'student', per_page: 100 }),
          assignmentAPI.getAssignments({ per_page: 100 })
        ]);

        setStudents(studentsResponse.data)
        setAssignments(assignmentsResponse.data)

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
        const today = getServerTime()
        today.setHours(0, 0, 0, 0)

        const assignmentStatsCalc = assignmentsResponse.data.reduce((acc, assignment) => {
          const startDate = new Date(assignment.event_start_datetime)

          if (assignment.status === 'confirmed' || assignment.status === 'pending') acc.active++

          if (assignment.status === 'complete' &&
            startDate >= today && startDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
            acc.completedToday++
          }

          if (startDate > getServerTime()) acc.upcoming++

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

  // Fetch availability when date changes
  useEffect(() => {
    if (!currentUser) return

    const fetchAvailability = async () => {
      try {
        const response = await availabilityAPI.getAvailability({ per_page: 100, date: selectedDate })
        setAvailability(response.data)
      } catch (err) {
        console.error("Failed to fetch availability:", err)
      }
    }

    fetchAvailability()
  }, [currentUser, selectedDate])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Calculate Monthly Data from Assignments (Total Hours)
  const calculateMonthlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = getServerTime().getFullYear();

    // Initialize data structure
    const data = months.map(month => ({ name: month, hours: 0 }));

    assignments.forEach(assignment => {
      const date = new Date(assignment.event_start_datetime);
      const endDate = new Date(assignment.event_end_datetime);
      const now = getServerTime();

      // Consider 'complete' assignments OR 'confirmed' assignments that are in the past
      const isCompleteOrPastConfirmed =
        (assignment.status === 'complete') ||
        (assignment.status === 'confirmed' && endDate < now);

      if (date.getFullYear() === currentYear && isCompleteOrPastConfirmed) {
        const duration = Math.abs(endDate.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (assignment.users && assignment.users.length > 0) {
          assignment.users.forEach(user => {
            // Check user status
            if (user.pivot?.status === 'completed' || user.pivot?.status === 'accepted') {
              const monthIndex = date.getMonth();
              data[monthIndex].hours += duration;
            }
          });
        }
      }
    });

    // Round numbers
    return data.map(entry => ({
      ...entry,
      hours: Math.round(entry.hours * 10) / 10
    }));
  };

  const monthlyData = calculateMonthlyData();

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

  const handleEventClick = (event: CalendarEvent) => {
    const assignment = assignments.find(a => a.id.toString() === event.id)
    if (assignment) {
      setSelectedAssignment(assignment)
      setIsDetailModalOpen(true)
    }
  }

  // Prepare calendar events
  const calendarEvents: CalendarEvent[] = assignments.map(assignment => {
    let colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-500";

    if (assignment.status === 'confirmed') {
      colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-500";
    } else if (assignment.status === 'pending') {
      colorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white border-blue-500";
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
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
            <NotificationDropdown />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Key Metrics - Compact View */}
              <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm justify-center sm:justify-start">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">{stats.totalStudents} Students</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm justify-center sm:justify-start">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs sm:text-sm font-medium">{Math.round(stats.monthlyHours)}h This Month</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm justify-center sm:justify-start">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs sm:text-sm font-medium">{stats.averageHours.toFixed(1)}h Avg/Week</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm justify-center sm:justify-start">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">{Math.round(stats.completionRate)}% Completion</span>
                </div>
              </div>

              {/* Monthly Hours Chart */}


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
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors gap-4 sm:gap-0"
                            onClick={() => router.push(`/student/${student.id}`)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-muted-foreground' : index === 2 ? 'bg-orange-500' : 'bg-muted-foreground/70'
                                }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">{student.name}</h4>
                                <p className="text-sm text-muted-foreground">{student.hours_worked_this_week || 0} hours completed</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right pl-12 sm:pl-0">
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
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4 sm:gap-0">
                  <CardTitle className="text-foreground font-bold">Daily Availability View</CardTitle>
                  <div className="flex items-center bg-card rounded-lg border border-border shadow-sm p-1 w-full sm:w-auto justify-between sm:justify-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted rounded-md text-muted-foreground"
                      onClick={() => {
                        const date = new Date(selectedDate)
                        date.setDate(date.getDate() - 1)
                        setSelectedDate(date.toISOString().split('T')[0])
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center px-2 flex-1 sm:flex-none justify-center">
                      <Label htmlFor="date-picker" className="sr-only">Select Date</Label>
                      <Input
                        id="date-picker"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-auto border-0 focus-visible:ring-0 h-8 font-medium text-foreground bg-transparent p-0"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted rounded-md text-muted-foreground"
                      onClick={() => {
                        const date = new Date(selectedDate)
                        date.setDate(date.getDate() + 1)
                        setSelectedDate(date.toISOString().split('T')[0])
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading availability...</div>
                    ) : (
                      <div className="space-y-2">
                        {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => { // 7 AM to 9 PM
                          const timeString = `${hour.toString().padStart(2, '0')}:00`;

                          // Filter students available at this hour
                          const availableStudents = availability.filter(a => {
                            if (a.date !== selectedDate) return false;
                            if (a.status !== 'available') return false;

                            const startHour = parseInt(a.start_time.split(':')[0]);
                            const endHour = parseInt(a.end_time.split(':')[0]);

                            return hour >= startHour && hour < endHour;
                          });

                          // Remove duplicates and ensure user object exists
                          const uniqueStudents = Array.from(new Map(availableStudents.map(item => [item.student_id, item.user])).values()).filter(Boolean);

                          return (
                            <div key={hour} className="flex flex-col sm:flex-row border-b border-border py-3 last:border-0 gap-2 sm:gap-0">
                              <div className="w-full sm:w-20 flex-shrink-0 font-medium text-muted-foreground pt-0 sm:pt-2 text-sm sm:text-base">
                                {timeString}
                              </div>
                              <div className="flex-1">
                                {uniqueStudents.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {uniqueStudents.map((student: any) => {
                                      // Pen Hex Colors Reference - Darker Shades
                                      const colors = [
                                        // Blue
                                        { border: 'border-[#2874A6]', bg: 'bg-[#2874A6]' },
                                        // Red
                                        { border: 'border-[#910100]', bg: 'bg-[#910100]' },
                                        // Purple
                                        { border: 'border-[#7B4384]', bg: 'bg-[#7B4384]' },
                                        // Yellow
                                        { border: 'border-[#FAA300]', bg: 'bg-[#FAA300]' },
                                      ];
                                      const colorIndex = student.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
                                      const style = colors[colorIndex];

                                      return (
                                        <div
                                          key={student.id}
                                          className={`
                                            flex items-center space-x-2 
                                            bg-card border-l-[3px] ${style.border}
                                            rounded-r-lg rounded-l-[2px]
                                            pl-2 pr-3 py-1.5 
                                            cursor-pointer 
                                            transition-all duration-300 
                                            hover:scale-105 shadow-sm hover:shadow-md hover:bg-muted
                                            border-y border-r border-border
                                            group
                                          `}
                                          onClick={() => router.push(`/student/${student.id}`)}
                                        >
                                          <Avatar className={`h-6 w-6 border ${style.border}`}>
                                            <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                                            <AvatarFallback className={`text-[9px] ${style.bg} text-white font-bold`}>
                                              {getInitials(student.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors tracking-wide">
                                            {student.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground italic pt-0 sm:pt-2">No students available</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assignment Schedules Tab */}
          {activeTab === "assignment-schedules" && (
            <div className="space-y-6">
              {/* Assignment Timeline */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Upcoming Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments
                      .filter(a => new Date(a.event_start_datetime) >= getServerTime())
                      .sort((a, b) => new Date(a.event_start_datetime).getTime() - new Date(b.event_start_datetime).getTime())
                      .slice(0, 5)
                      .map((assignment, index) => (
                        <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg border-l-4 border-purple-500 dark:border-purple-400 gap-4 sm:gap-0">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <ClipboardList className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{assignment.assignment_name}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-1 sm:line-clamp-none">
                                {assignment.users && assignment.users.length > 0
                                  ? `Assigned to: ${assignment.users.map(u => u.name).join(', ')}`
                                  : 'Unassigned'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(assignment.event_start_datetime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 self-start sm:self-center pl-16 sm:pl-0">
                            <Badge className={`text-xs px-2 py-1 ${assignment.status === "pending" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white" :
                              assignment.status === "confirmed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                              }`}>
                              {assignment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {assignments.filter(a => new Date(a.event_start_datetime) >= getServerTime()).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">No upcoming assignments found.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Calendar View */}
              <div className="h-[500px] sm:h-[700px]">
                <CalendarComponent
                  events={calendarEvents}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  onEventClick={handleEventClick}
                  isMobile={isMobile}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      <AssignmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        assignment={selectedAssignment}
      />
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
