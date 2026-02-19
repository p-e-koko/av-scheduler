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
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  ClipboardList,
  Eye,
  Search,
  Filter,
  Menu,
  MoreHorizontal,
  ChevronDown,
  Grid3X3,
  List
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "student-schedules" | "assignment-schedules" | "students">("dashboard")

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['dashboard', 'student-schedules', 'assignment-schedules', 'students'].includes(tab)) {
      setActiveTab(tab as any)
    }
  }, [searchParams])

  const handleTabChange = (tab: "dashboard" | "student-schedules" | "assignment-schedules" | "students") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/supervisor?${params.toString()}`)
    setActiveTab(tab)
  }

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
  const [assignmentDate, setAssignmentDate] = useState<Date>(new Date())
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

  // Student View State
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [studentPagination, setStudentPagination] = useState<any>(null)
  const [studentCurrentPage, setStudentCurrentPage] = useState(1)

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
        setAssignmentDate(new Date(serverToday));
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

        // Dependent on tab, we fetch different data strategies
        if (activeTab === 'students') {
          // Client-side Strategy
          const [studentsResponse] = await Promise.all([
            userAPI.getUsers({
              role: 'student',
              per_page: 1000,
            })
          ]);
          setStudents(studentsResponse.data)
          // setStudentPagination is not needed for client-side
        } else {
          // Load All Strategy for Dashboard/Schedules (Need all data for stats/grids)
          // We only fetch if we are in a tab that needs it. 
          // To avoid re-fetching too often, we might check if we already have data, 
          // but for simplicity and correctness (refreshing data) let's fetch.

          const [studentsResponse, assignmentsResponse] = await Promise.all([
            userAPI.getUsers({ role: 'student', per_page: 100 }), // Get all for stats
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
        }

      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser, activeTab, studentCurrentPage]) // Trigger on tab change or page change

  // Debounced search effect
  useEffect(() => {
    if (activeTab === 'students') {
      const timeout = setTimeout(() => {
        if (studentCurrentPage !== 1) {
          setStudentCurrentPage(1)
        } else {
          // Manually trigger fetch if page is already 1, or rely on dependency
          // But we need to call fetchData. 
          // Since fetchData behaves differently based on tab, we can't easily call it directly 
          // if it's inside the other useEffect. 
          // Actually, adding studentSearchQuery to the main useEffect dependencies is better.
        }
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [studentSearchQuery])

  // Add studentSearchQuery to main useEffect dependent
  useEffect(() => {
    if (activeTab === 'students') {
      // This is handled by the debounce effect updating page or the main effect
      // We will add studentSearchQuery to the main effect dependencies 
      // BUT we need to be careful about not fetching twice.
      // The debounce effect sets page to 1.
      // If page is already 1, we still want to fetch.
    }
  }, [])


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

  // Helper to get student weekly stats
  const getStudentWeeklyStats = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return { promised: 0, worked: 0, assigned: 0 };

    const promised = parseFloat(student.promised_hours_per_week || '0');

    // Get current week range
    const now = getServerTime();
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfWeek.setHours(0, 0, 0, 0);
    if (day !== 1) startOfWeek.setDate(now.getDate() - (day - 1));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let worked = 0;
    let assigned = 0;

    assignments.forEach(a => {
      if (a.users?.some(u => u.id === studentId)) {
        const startDate = new Date(a.event_start_datetime);
        if (startDate >= startOfWeek && startDate <= endOfWeek) {
          const duration = (new Date(a.event_end_datetime).getTime() - new Date(a.event_start_datetime).getTime()) / (1000 * 60 * 60);
          if (a.status === 'complete') {
            worked += duration;
          } else if (a.status === 'confirmed' || a.status === 'pending') {
            assigned += duration;
          }
        }
      }
    });

    return { promised, worked, assigned };
  };

  // Filter students
  // When in 'students' tab, we rely on server-side search, so no client-side filtering needed for the main list.
  // However, for other tabs (dashboard stats), we might still use client side filtering if we wanted search there?
  // The original code used `filteredStudents` for the dashboard list too. 
  // We will keep `filteredStudents` logic BUT make it just return `students` if we are in 'students' tab 
  // (since `students` is already filtered from server).
  // Client-side Filter and Sort
  const filteredStudents = React.useMemo(() => {
    let result = [...students];

    // Search (Apply for all tabs where search is active)
    if (studentSearchQuery) {
      const query = studentSearchQuery.toLowerCase();
      result = result.filter(student =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    }

    // Sort Alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [students, studentSearchQuery]);

  // Client-side Pagination
  const itemsPerPage = 10;
  const paginatedStudents = React.useMemo(() => {
    // Only paginate for 'students' tab if viewMode is card/list
    if (activeTab === 'dashboard') return filteredStudents;

    const startIndex = (studentCurrentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, studentCurrentPage, activeTab]);

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
        onTabChange={handleTabChange}
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
                  {activeTab === "students" && "View Students"}
                  {activeTab === "student-schedules" && "Student Schedule"}
                  {activeTab === "assignment-schedules" && "Assignment Schedule"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "dashboard" && "Overview of student assignment hours and performance"}
                  {activeTab === "students" && "View and manage student information"}
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
          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                {/* View Toggle */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border">
                    <Button
                      variant={viewMode === "card" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("card")}
                      className={viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                    >
                      <Grid3X3 className="w-4 h-4 mr-1" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                    >
                      <List className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-10 w-full bg-card/80 backdrop-blur-xl border-border focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading students...</div>
              ) : (
                <>
                  {viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedStudents.map((student) => (
                        <Card
                          key={student.id}
                          className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all cursor-pointer h-32"
                          onClick={() => router.push(`/student/${student.id}`)}
                        >
                          <CardContent className="p-4 h-full">
                            <div className="flex items-center space-x-4 h-full">
                              <Avatar className="h-16 w-16 flex-shrink-0">
                                <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                                  {getInitials(student.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div>
                                  <h3 className="font-semibold text-foreground text-sm truncate">{student.name}</h3>
                                  <p className="text-xs text-muted-foreground truncate">Student ID: {student.student_id || 'N/A'}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={student.email}>{student.email}</p>
                                    {student.email_verified_at && (
                                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">Student</Badge>
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-white dark:border-blue-800">
                                    {Number(student.promised_hours_per_week || 0).toFixed(2)}h/week
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${(Number(student.remaining_hours_this_week) || 0) > 0
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                                    : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                    }`}>
                                    {Number(student.remaining_hours_this_week || 0).toFixed(1)}h Remaining
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">No students found matching your search.</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Hours
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Email
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(paginatedStudents || []).map((student) => (
                              <tr
                                key={student.id}
                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => router.push(`/student/${student.id}`)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={student.profile_picture_url || ""} />
                                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                        {getInitials(student.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-foreground">{student.name}</div>
                                      <div className="text-sm text-muted-foreground">{student.student_id || 'No Student ID'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="secondary" className="text-xs">
                                    Student
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="text-xs w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-white dark:border-blue-800">
                                      {student.promised_hours_per_week || '0'}h Promised
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs w-fit ${(Number(student.remaining_hours_this_week) || 0) > 0
                                      ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                                      : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                      }`}>
                                      {student.remaining_hours_this_week ? Number(student.remaining_hours_this_week).toFixed(1) : '0'}h Remaining
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    {student.email}
                                    {student.email_verified_at && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {/* Pagination */}
                  {filteredStudents.length > itemsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                      <div className="text-sm text-gray-500">
                        Showing {(studentCurrentPage - 1) * itemsPerPage + 1} to {Math.min(studentCurrentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentCurrentPage(p => Math.max(1, p - 1))}
                          disabled={studentCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm font-medium">
                          Page {studentCurrentPage} of {Math.ceil(filteredStudents.length / itemsPerPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentCurrentPage(p => Math.min(Math.ceil(filteredStudents.length / itemsPerPage), p + 1))}
                          disabled={studentCurrentPage === Math.ceil(filteredStudents.length / itemsPerPage)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Student Hours Overview (Weekly)</CardTitle>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 rounded-l-lg">Student</th>
                            <th className="px-4 py-3">Promised Hours</th>
                            <th className="px-4 py-3">Hours Status</th>
                            <th className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredStudents.map(student => {
                            const stats = getStudentWeeklyStats(student.id);
                            const totalProjected = stats.worked + stats.assigned;
                            const progress = stats.promised > 0 ? (totalProjected / stats.promised) * 100 : 0;
                            const isOverPromised = totalProjected > stats.promised;
                            const workedPercent = stats.promised > 0 ? (stats.worked / stats.promised) * 100 : 0;
                            const assignedPercent = stats.promised > 0 ? (stats.assigned / stats.promised) * 100 : 0;

                            return (
                              <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-4 font-medium">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                                      <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-foreground">{student.name}</div>
                                      <div className="text-xs text-muted-foreground">{student.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="font-semibold">{stats.promised}h</span> <span className="text-muted-foreground">/ week</span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="w-full max-w-xs space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                      <span>
                                        <span className="font-medium text-green-600 dark:text-green-400">{stats.worked.toFixed(1)}h</span> worked
                                        <span className="text-muted-foreground mx-1">•</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">{stats.assigned.toFixed(1)}h</span> assigned
                                      </span>
                                      <span className={isOverPromised ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                        {Math.round(progress)}%
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                                      <div
                                        style={{ width: `${Math.min(100, workedPercent)}%` }}
                                        className="h-full bg-green-500"
                                      />
                                      <div
                                        style={{ width: `${Math.min(100 - Math.min(100, workedPercent), assignedPercent)}%` }}
                                        className="h-full bg-blue-500"
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <Button size="sm" variant="outline" onClick={() => router.push(`/student/${student.id}`)}>
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="space-y-4 md:hidden">
                      {filteredStudents.map(student => {
                        const stats = getStudentWeeklyStats(student.id);
                        const totalProjected = stats.worked + stats.assigned;
                        const progress = stats.promised > 0 ? (totalProjected / stats.promised) * 100 : 0;
                        const workedPercent = stats.promised > 0 ? (stats.worked / stats.promised) * 100 : 0;
                        const assignedPercent = stats.promised > 0 ? (stats.assigned / stats.promised) * 100 : 0;

                        return (
                          <div key={student.id} className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={student.profile_picture || student.profile_picture_url || ""} />
                                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">{student.name}</div>
                                  <div className="text-xs text-muted-foreground">Target: {stats.promised}h / week</div>
                                </div>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => router.push(`/student/${student.id}`)}>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                                    {stats.worked.toFixed(1)}h Done
                                  </Badge>
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
                                    {stats.assigned.toFixed(1)}h Assigned
                                  </Badge>
                                </div>
                                <span className="font-semibold text-sm">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                                <div
                                  style={{ width: `${Math.min(100, workedPercent)}%` }}
                                  className="h-full bg-green-500"
                                />
                                <div
                                  style={{ width: `${Math.min(100 - Math.min(100, workedPercent), assignedPercent)}%` }}
                                  className="h-full bg-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredStudents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No students found matching your search.
                      </div>
                    )}
                  </div>
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

                          // Filter students who don't have a conflict
                          const uniqueStudents = (students || []).filter(student => {
                            // Check for conflicts
                            const hasConflict = availability.some(a => {
                              if (a.student_id !== student.id.toString() && a.student_id !== student.id) return false; // Handle potential string/number mismatch
                              // We only care about blocking statuses
                              if (a.status !== 'class' && a.status !== 'unavailable') return false;

                              const startHour = parseInt(a.start_time.split(':')[0]);
                              const endHour = parseInt(a.end_time.split(':')[0]);

                              // Check if this hour falls within the blocked slot
                              return hour >= startHour && hour < endHour;
                            });

                            return !hasConflict;
                          });

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
                  date={assignmentDate}
                  onViewChange={setCalendarView}
                  onDateChange={setAssignmentDate}
                  onDateClick={(date) => {
                    setAssignmentDate(date)
                    setCalendarView("day")
                  }}
                  onEventClick={handleEventClick}
                  isMobile={isMobile}
                />
              </div>
            </div>
          )}
        </main>
      </div >
      <AssignmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        assignment={selectedAssignment}
      />
    </div >
  )
}

export default function ProtectedSupervisorDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['supervisor', 'admin']}>
      <SupervisorDashboard />
    </RoleProtectedRoute>
  )
}
