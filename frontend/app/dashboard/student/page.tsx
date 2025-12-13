"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  User, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Edit,
  Camera,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Grid,
  List,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Menu
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { AddAvailabilityModal } from "@/components/AddAvailabilityModal"
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"

import { 
  authAPI,
  getStoredUser,
  formatAPIError,
  hasAnyRole,
  type User as UserType,
  assignmentAPI,
  availabilityAPI,
  type Assignment,
  type Availability
} from "@/lib/api"
import { StudentSidebar } from "@/components/StudentSidebar"
import { RejectAssignmentModal } from "@/components/RejectAssignmentModal"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { LoadingDialog } from "@/components/LoadingDialog"

function StudentDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "assignments" | "schedule">("profile")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "me">("all")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [isAddAvailabilityModalOpen, setIsAddAvailabilityModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [selectedAssignmentForRejection, setSelectedAssignmentForRejection] = useState<Assignment | null>(null)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [selectedAssignmentForAcceptance, setSelectedAssignmentForAcceptance] = useState<Assignment | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Pagination
  const [assignmentPagination, setAssignmentPagination] = useState<any>(null)
  const [assignmentCurrentPage, setAssignmentCurrentPage] = useState(1)

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [assignmentStats, setAssignmentStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  })

  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(false)
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month")

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check authentication and permissions
  useEffect(() => {
    const user = getStoredUser()
    if (!user) {
      router.push('/login')
      return
    }
    
    if (!hasAnyRole(['student', 'admin'])) {
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
          case 'profile':
            // Fetch assignments and availability for profile view
            const [profileAssignmentsResponse, profileAvailabilityResponse] = await Promise.all([
              assignmentAPI.getMyAssignments({ per_page: 50 }),
              availabilityAPI.getMyAvailability({ per_page: 50 })
            ])
            setMyAssignments(profileAssignmentsResponse.data)
            setAvailability(profileAvailabilityResponse.data)
            break

          case 'assignments':
            if (assignmentFilter === 'all') {
              const [allAssignmentsResponse, myAssignmentsResponse] = await Promise.all([
                assignmentAPI.getAssignments({ 
                  per_page: 10, 
                  page: assignmentCurrentPage 
                }),
                assignmentAPI.getMyAssignments({ per_page: 100 })
              ])
              
              setAssignments(allAssignmentsResponse.data)
              setAssignmentPagination({
                current_page: allAssignmentsResponse.current_page,
                last_page: allAssignmentsResponse.last_page,
                total: allAssignmentsResponse.total,
                from: allAssignmentsResponse.from,
                to: allAssignmentsResponse.to
              })
              
              const stats = myAssignmentsResponse.data.reduce((acc, assignment) => {
                acc.total++
                switch (assignment.status) {
                  case 'complete':
                    acc.completed++
                    break
                  case 'confirmed':
                    acc.inProgress++
                    break
                  case 'pending':
                    acc.pending++
                    break
                  default:
                    break
                }
                return acc
              }, { total: 0, completed: 0, inProgress: 0, pending: 0 })
              
              setAssignmentStats(stats)
            } else {
              const [myAssignmentsResponse, allMyAssignmentsResponse] = await Promise.all([
                assignmentAPI.getMyAssignments({ 
                  per_page: 10, 
                  page: assignmentCurrentPage 
                }),
                assignmentAPI.getMyAssignments({ per_page: 100 })
              ])
              
              setMyAssignments(myAssignmentsResponse.data)
              setAssignmentPagination({
                current_page: myAssignmentsResponse.current_page,
                last_page: myAssignmentsResponse.last_page,
                total: myAssignmentsResponse.total,
                from: myAssignmentsResponse.from,
                to: myAssignmentsResponse.to
              })
              
              const stats = allMyAssignmentsResponse.data.reduce((acc, assignment) => {
                acc.total++
                switch (assignment.status) {
                  case 'complete':
                    acc.completed++
                    break
                  case 'confirmed':
                    acc.inProgress++
                    break
                  case 'pending':
                    acc.pending++
                    break
                  default:
                    break
                }
                return acc
              }, { total: 0, completed: 0, inProgress: 0, pending: 0 })
              
              setAssignmentStats(stats)
            }
            break

          case 'schedule':
            const availabilityResponse = await availabilityAPI.getMyAvailability({ per_page: 100 })
            setAvailability(availabilityResponse.data)
            break
        }
      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser, activeTab, assignmentCurrentPage, assignmentFilter])

  const refreshAssignments = async () => {
    try {
      setLoading(true)
      const [allAssignmentsResponse, myAssignmentsResponse] = await Promise.all([
        assignmentAPI.getAssignments({ per_page: 50 }),
        assignmentAPI.getMyAssignments({ per_page: 50 })
      ])
      
      setAssignments(allAssignmentsResponse.data)
      setMyAssignments(myAssignmentsResponse.data)
      
      // Recalculate stats
      const stats = myAssignmentsResponse.data.reduce((acc, assignment) => {
        acc.total++
        switch (assignment.status) {
          case 'complete':
            acc.completed++
            break
          case 'confirmed':
            acc.inProgress++
            break
          case 'pending':
            acc.pending++
            break
          default:
            break
        }
        return acc
      }, { total: 0, completed: 0, inProgress: 0, pending: 0 })
      
      setAssignmentStats(stats)
    } catch (err) {
      console.error("Failed to refresh assignments", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAssignment = (id: number) => {
    const assignment = assignments.find(a => a.id === id) || myAssignments.find(a => a.id === id)
    if (assignment) {
      setSelectedAssignmentForAcceptance(assignment)
      setIsAcceptModalOpen(true)
    }
  }

  const confirmAcceptAssignment = async () => {
    if (!selectedAssignmentForAcceptance) return

    try {
      setIsProcessing(true)
      await assignmentAPI.acceptAssignment(selectedAssignmentForAcceptance.id)
      await refreshAssignments()
      setIsAcceptModalOpen(false)
      setSelectedAssignmentForAcceptance(null)
    } catch (err) {
      console.error("Failed to accept assignment", err)
      setError(formatAPIError(err))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectAssignment = (id: number) => {
    const assignment = myAssignments.find(a => a.id === id)
    if (assignment) {
      setSelectedAssignmentForRejection(assignment)
      setIsRejectModalOpen(true)
    }
  }

  const confirmRejectAssignment = async (reason: string) => {
    if (!selectedAssignmentForRejection) return

    try {
      setIsProcessing(true)
      await assignmentAPI.rejectAssignment(selectedAssignmentForRejection.id, reason)
      await refreshAssignments()
      setIsRejectModalOpen(false)
      setSelectedAssignmentForRejection(null)
    } catch (err) {
      console.error("Failed to reject assignment", err)
      setError(formatAPIError(err))
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate hours data
  const hoursData = React.useMemo(() => {
    if (!currentUser) return { promised: 0, worked: 0, remaining: 0, percentage: 0 }
    
    const promised = parseFloat(currentUser.promised_hours_per_week || '0')
    
    // Get start and end of current week
    const now = new Date()
    const startOfWeek = new Date(now)
    const day = now.getDay() || 7 // Get current day number, converting Sun (0) to 7
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1)) // Set to Monday
    else startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Use myAssignments if available, otherwise empty array
    const assignedHours = myAssignments
      .filter(a => {
        const eventDate = new Date(a.event_start_datetime)
        // Check pivot status if available, otherwise assume pending/assigned
        const myStatus = a.pivot?.status || 'pending';
        const isRejected = myStatus === 'rejected';
        
        // Include all assignments that are not rejected
        return !isRejected && eventDate >= startOfWeek && eventDate <= endOfWeek
      })
      .reduce((acc, curr) => {
        const start = new Date(curr.event_start_datetime)
        const end = new Date(curr.event_end_datetime)
        return acc + Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

    // Calculate worked hours (only completed assignments)
    const worked = myAssignments
      .filter(a => {
        const eventDate = new Date(a.event_start_datetime)
        return a.status === 'complete' && eventDate >= startOfWeek && eventDate <= endOfWeek
      })
      .reduce((acc, curr) => {
        const start = new Date(curr.event_start_datetime)
        const end = new Date(curr.event_end_datetime)
        return acc + Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

    const remaining = Math.max(0, promised - assignedHours)
    const percentage = promised > 0 ? Math.min(100, (worked / promised) * 100) : 0

    return { promised, worked, remaining, percentage }
  }, [currentUser, myAssignments])

  const calendarEvents = React.useMemo(() => {
    return availability.map(slot => {
      // Parse date and time
      const dateStr = slot.date.split('T')[0] // Ensure we have YYYY-MM-DD
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'unavailable':
      case 'busy':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'class':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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

  const handleAvailabilityAdded = async () => {
    try {
      const response = await availabilityAPI.getMyAvailability({ per_page: 100 })
      setAvailability(response.data)
    } catch (error) {
      console.error("Failed to refresh availability:", error)
    }
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
    <div className="flex h-screen bg-background">
      <StudentSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 md:px-6 py-4 pt-6">
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
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {activeTab === "profile" && "My Profile"}
                {activeTab === "assignments" && "My Assignments"}
                {activeTab === "schedule" && "My Schedule"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeTab === "profile" && "Manage your profile and skills"}
                {activeTab === "assignments" && "View and track your assignments"}
                {activeTab === "schedule" && "Manage your availability"}
              </p>
            </div>
            </div>
            {activeTab === "assignments" && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border">
                  <Button
                    variant={assignmentFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setAssignmentFilter("all")
                      setAssignmentCurrentPage(1)
                    }}
                    className={assignmentFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                  >
                    All
                  </Button>
                  <Button
                    variant={assignmentFilter === "me" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setAssignmentFilter("me")
                      setAssignmentCurrentPage(1)
                    }}
                    className={assignmentFilter === "me" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                  >
                    Mine
                  </Button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Profile Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Profile Card */}
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="relative inline-block">
                        <Avatar className="h-24 w-24 mx-auto">
                          <AvatarImage src={currentUser.profile_picture_url || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                            {getInitials(currentUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          size="icon"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-foreground mt-4">{currentUser.name}</h3>
                      <p className="text-muted-foreground">{currentUser.email}</p>
                      {currentUser.student_id && (
                        <p className="text-sm text-muted-foreground mt-1">ID: {currentUser.student_id}</p>
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
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Promised Hours/Week</span>
                        <span className="font-medium text-foreground">{currentUser.promised_hours_per_week || '0'}h</span>
                      </div>

                      <div className="pt-4 space-y-2">
                        <Button className="w-full bg-primary hover:bg-primary-dark text-primary-foreground">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground">
                          <Star className="w-4 h-4 mr-2" />
                          Update Skills
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Hours & Availability */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hours Summary Card */}
                <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <Clock className="w-5 h-5 mr-2 text-primary" />
                      Hours Summary (This Week)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Promised</p>
                          <p className="text-2xl font-bold text-blue-700 dark:text-white">{hoursData.promised}h</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Worked</p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{hoursData.worked.toFixed(1)}h</p>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{hoursData.remaining.toFixed(1)}h</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progress</span>
                          <span>{Math.round(hoursData.percentage)}%</span>
                        </div>
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
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
                <div className="bg-card/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden">
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
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {/* Assignment Stats - Compact View */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{assignmentStats.total} Total</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">{assignmentStats.completed} Completed</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium">{assignmentStats.inProgress} In Progress</span>
                </div>
                <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium">{assignmentStats.pending} Pending</span>
                </div>
              </div>

              {/* Assignments List */}
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                    <CardTitle>
                      {assignmentFilter === "all" ? "All Assignments" : "My Assignments"}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10 w-full md:w-64 bg-card/80"
                        />
                      </div>
                      <div className="flex items-center bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border">
                        <Button
                          variant={viewMode === "card" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("card")}
                          className={viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                        >
                          <Grid className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                          className={viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-destructive">{error}</div>
                  ) : (
                    <div className={viewMode === "card" 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                      : "space-y-4"
                    }>
                      {/* Display assignments based on filter */}
                      {(assignmentFilter === "all" ? assignments : myAssignments).map((assignment) => (
                        <div key={assignment.id} className={`${
                          viewMode === "card" 
                            ? "p-4 bg-muted/50 rounded-lg border border-border" 
                            : "flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        }`}>
                          <div className={`${viewMode === "card" ? "space-y-3" : "flex items-center space-x-4"}`}>
                            {viewMode === "card" && (
                              <div className="flex items-center justify-between">
                                <Badge className={`${
                                  assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
                                }`}>
                                  {assignment.status}
                                </Badge>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className={`${viewMode === "card" ? "" : "flex items-center space-x-3"}`}>
                              {viewMode === "list" && (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="w-5 h-5 text-blue-600 dark:text-white" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-foreground">{assignment.assignment_name}</h4>
                                <p className="text-sm text-muted-foreground">{assignment.event_name} • {assignment.event_location}</p>
                                <p className="text-xs text-muted-foreground">{new Date(assignment.event_start_datetime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {viewMode === "list" && (
                              <div className="flex items-center space-x-2">
                                <Badge className={`${
                                  assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
                                }`}>
                                  {assignment.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {viewMode === "card" && (
                            <div className="space-y-2 mt-4">
                              <Button size="sm" className="w-full bg-primary hover:bg-primary-dark text-primary-foreground">
                                View Details
                              </Button>
                              
                              {/* Accept/Reject Buttons for My Assignments */}
                              {assignment.pivot && assignment.status !== 'complete' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    {assignment.pivot.status !== 'accepted' && assignment.pivot.status !== 'rejected' && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                          onClick={() => handleAcceptAssignment(assignment.id)}
                                        >
                                          Accept
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          className="flex-1"
                                          onClick={() => handleRejectAssignment(assignment.id)}
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    {assignment.pivot.status === 'accepted' && (
                                       <Button 
                                          size="sm" 
                                          variant="destructive"
                                          className="flex-1"
                                          onClick={() => handleRejectAssignment(assignment.id)}
                                        >
                                          Reject
                                        </Button>
                                    )}
                                     {assignment.pivot.status === 'rejected' && (
                                       <Button 
                                          size="sm" 
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                          onClick={() => handleAcceptAssignment(assignment.id)}
                                        >
                                          Accept
                                        </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-center text-muted-foreground">
                                    My Status: <span className={`font-medium capitalize ${
                                      assignment.pivot.status === 'accepted' ? 'text-green-600 dark:text-green-400' :
                                      assignment.pivot.status === 'rejected' ? 'text-red-600 dark:text-red-400' :
                                      'text-orange-600 dark:text-orange-400'
                                    }`}>{assignment.pivot.status}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {(assignmentFilter === "all" ? assignments : myAssignments).length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No assignments found
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pagination */}
                  {assignmentPagination && assignmentPagination.last_page > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {assignmentPagination.from} to {assignmentPagination.to} of {assignmentPagination.total} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssignmentCurrentPage(p => Math.max(1, p - 1))}
                          disabled={assignmentCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm font-medium">
                          Page {assignmentCurrentPage} of {assignmentPagination.last_page}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssignmentCurrentPage(p => Math.min(assignmentPagination.last_page, p + 1))}
                          disabled={assignmentCurrentPage === assignmentPagination.last_page}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">My Schedule</h2>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary-dark text-primary-foreground" 
                  onClick={() => setIsAddAvailabilityModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isMobile ? "Add" : "Add Availability"}
                </Button>
              </div>

              <CalendarComponent
                events={calendarEvents}
                view={calendarView}
                onViewChange={setCalendarView}
                isMobile={isMobile}
                className="min-h-[600px]"
              />
            </div>
          )}
        </main>
      </div>
      <AddAvailabilityModal 
        isOpen={isAddAvailabilityModalOpen} 
        onClose={() => setIsAddAvailabilityModalOpen(false)} 
        onSuccess={handleAvailabilityAdded}
      />
      {selectedAssignmentForRejection && (
        <RejectAssignmentModal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={confirmRejectAssignment}
          assignmentName={selectedAssignmentForRejection.assignment_name}
        />
      )}
      <ConfirmationDialog
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        onConfirm={confirmAcceptAssignment}
        title="Accept Assignment"
        description={`Are you sure you want to accept the assignment "${selectedAssignmentForAcceptance?.assignment_name}"?`}
        confirmText="Accept"
      />
      <LoadingDialog
        isOpen={isProcessing}
        title="Processing"
        description="Please wait while we update the assignment status..."
      />
    </div>
  )
}

export default function ProtectedStudentDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['student', 'admin']}>
      <StudentDashboard />
    </RoleProtectedRoute>
  )
}
