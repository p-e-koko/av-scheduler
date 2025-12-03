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
  ChevronUp
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { AddAvailabilityModal } from "@/components/AddAvailabilityModal"
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect"

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

function StudentDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "assignments" | "schedule">("profile")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "me">("all")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [isAddAvailabilityModalOpen, setIsAddAvailabilityModalOpen] = useState(false)

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
            // Fetch both all assignments and my assignments
            const [allAssignmentsResponse, myAssignmentsResponse] = await Promise.all([
              assignmentAPI.getAssignments({ per_page: 50 }),
              assignmentAPI.getMyAssignments({ per_page: 50 })
            ])
            
            setAssignments(allAssignmentsResponse.data)
            setMyAssignments(myAssignmentsResponse.data)
            
            // Calculate stats from my assignments
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
  }, [currentUser, activeTab])

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
    const worked = myAssignments
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
  }, [currentUser, myAssignments])

  const calendarEvents = React.useMemo(() => {
    return availability.map(slot => {
      // Parse date and time
      const dateStr = slot.date.split('T')[0] // Ensure we have YYYY-MM-DD
      const startDateTime = new Date(`${dateStr}T${slot.start_time}`)
      const endDateTime = new Date(`${dateStr}T${slot.end_time}`)
      
      let color = "bg-green-100 text-green-800 border-green-200"
      let title = "Available"
      
      if (slot.status === 'unavailable') {
        color = "bg-red-100 text-red-800 border-red-200"
        title = "Unavailable"
      } else if (slot.status === 'class') {
        color = "bg-blue-100 text-blue-800 border-blue-200"
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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'unavailable':
      case 'busy':
        return 'bg-red-100 text-red-800'
      case 'class':
        return 'bg-blue-100 text-blue-800'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    <div className={`flex h-screen bg-gradient-to-br from-slate-50 to-white ${isMobile ? 'flex-col' : ''}`}>
      {/* Sidebar - Collapsible on mobile */}
      <div className={`${
        isMobile 
          ? sidebarCollapsed ? 'h-16' : 'h-64' 
          : sidebarCollapsed ? 'w-16' : 'w-64'
      } transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white/80 backdrop-blur-xl border-r border-gray-300/30 shadow-lg shadow-gray-100/50 h-full flex flex-col">
          {/* Sidebar Header - App Branding */}
          <div className="bg-gradient-to-r from-primary to-primary-medium text-white border-0 p-4">
            <div className="flex items-center justify-between">
              {(!sidebarCollapsed || isMobile) ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-lg">AV Scheduler</h1>
                    <p className="text-xs text-white/80">Student Portal</p>
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
                {sidebarCollapsed ? (
                  isMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : (
                  isMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar Navigation */}
          {!sidebarCollapsed && (
            <div className="flex-1 p-2">
              <nav className="space-y-1">
                <div 
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                    activeTab === "profile" 
                      ? 'text-primary bg-primary/10 border-primary/20' 
                      : 'text-gray-600 hover:bg-gray-100'
                  } hover:bg-primary/20 rounded-lg p-3 cursor-pointer transition-colors ${
                    activeTab === "profile" ? 'border' : ''
                  }`}
                >
                  <User className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Profile</span>
                </div>
                <div 
                  onClick={() => setActiveTab("assignments")}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                    activeTab === "assignments" 
                      ? 'text-primary bg-primary/10 border-primary/20' 
                      : 'text-gray-600 hover:bg-gray-100'
                  } hover:bg-primary/20 rounded-lg p-3 cursor-pointer transition-colors ${
                    activeTab === "assignments" ? 'border' : ''
                  }`}
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Assignments</span>
                </div>
                <div 
                  onClick={() => setActiveTab("schedule")}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} ${
                    activeTab === "schedule" 
                      ? 'text-primary bg-primary/10 border-primary/20' 
                      : 'text-gray-600 hover:bg-gray-100'
                  } hover:bg-primary/20 rounded-lg p-3 cursor-pointer transition-colors ${
                    activeTab === "schedule" ? 'border' : ''
                  }`}
                >
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">My Schedule</span>
                </div>
              </nav>
            </div>
          )}

          {/* Sidebar Footer - Current User */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-gray-200/30">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={currentUser.profile_picture_url || ""} />
                  <AvatarFallback className="bg-primary text-white font-semibold">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-gray-300/30 px-4 md:px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                {activeTab === "profile" && "My Profile"}
                {activeTab === "assignments" && "My Assignments"}
                {activeTab === "schedule" && "My Schedule"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === "profile" && "Manage your profile and skills"}
                {activeTab === "assignments" && "View and track your assignments"}
                {activeTab === "schedule" && "Manage your availability"}
              </p>
            </div>
            {activeTab === "assignments" && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30">
                  <Button
                    variant={assignmentFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAssignmentFilter("all")}
                    className={assignmentFilter === "all" ? "bg-primary text-white" : "text-gray-700"}
                  >
                    All
                  </Button>
                  <Button
                    variant={assignmentFilter === "me" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setAssignmentFilter("me")}
                    className={assignmentFilter === "me" ? "bg-primary text-white" : "text-gray-700"}
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
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="relative inline-block">
                        <Avatar className="h-24 w-24 mx-auto">
                          <AvatarImage src={currentUser.profile_picture_url || ""} />
                          <AvatarFallback className="bg-primary text-white text-2xl font-semibold">
                            {getInitials(currentUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          size="icon"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary hover:bg-primary-dark"
                        >
                          <Camera className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mt-4">{currentUser.name}</h3>
                      <p className="text-gray-600">{currentUser.email}</p>
                      {currentUser.student_id && (
                        <p className="text-sm text-gray-500 mt-1">ID: {currentUser.student_id}</p>
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
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Promised Hours/Week</span>
                        <span className="font-medium text-gray-900">{currentUser.promised_hours_per_week || '0'}h</span>
                      </div>

                      <div className="pt-4 space-y-2">
                        <Button className="w-full bg-primary hover:bg-primary-dark">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline" className="w-full">
                          <Star className="w-4 h-4 mr-2" />
                          Update Skills
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Google Calendar Integration */}
                <GoogleCalendarConnect />
              </div>

              {/* Right Column - Hours & Availability */}
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
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {/* Assignment Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/20">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                        <p className="text-xl md:text-2xl font-bold text-primary">{assignmentStats.total}</p>
                      </div>
                      <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-green-500/20">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-xl md:text-2xl font-bold text-green-600">{assignmentStats.completed}</p>
                      </div>
                      <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-orange-500/20">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">In Progress</p>
                        <p className="text-xl md:text-2xl font-bold text-orange-600">{assignmentStats.inProgress}</p>
                      </div>
                      <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-red-500/20">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-xl md:text-2xl font-bold text-red-600">{assignmentStats.pending}</p>
                      </div>
                      <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignments List */}
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                    <CardTitle>
                      {assignmentFilter === "all" ? "All Assignments" : "My Assignments"}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          className="pl-10 w-full md:w-64 bg-white/80"
                        />
                      </div>
                      <div className="flex items-center bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30">
                        <Button
                          variant={viewMode === "card" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("card")}
                        >
                          <Grid className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading assignments...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                  ) : (
                    <div className={viewMode === "card" 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                      : "space-y-4"
                    }>
                      {/* Display assignments based on filter */}
                      {(assignmentFilter === "all" ? assignments : myAssignments).map((assignment) => (
                        <div key={assignment.id} className={`${
                          viewMode === "card" 
                            ? "p-4 bg-gray-50/50 rounded-lg border" 
                            : "flex items-center justify-between p-4 bg-gray-50/50 rounded-lg"
                        }`}>
                          <div className={`${viewMode === "card" ? "space-y-3" : "flex items-center space-x-4"}`}>
                            {viewMode === "card" && (
                              <div className="flex items-center justify-between">
                                <Badge className={`${
                                  assignment.status === 'complete' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {assignment.status}
                                </Badge>
                                <Clock className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className={`${viewMode === "card" ? "" : "flex items-center space-x-3"}`}>
                              {viewMode === "list" && (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="w-5 h-5 text-blue-600" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-gray-900">{assignment.assignment_name}</h4>
                                <p className="text-sm text-gray-600">{assignment.event_name} • {assignment.event_location}</p>
                                <p className="text-xs text-gray-500">{new Date(assignment.event_start_datetime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {viewMode === "list" && (
                              <div className="flex items-center space-x-2">
                                <Badge className={`${
                                  assignment.status === 'complete' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {assignment.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {viewMode === "card" && (
                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                              View Details
                            </Button>
                          )}
                        </div>
                      ))}
                      {(assignmentFilter === "all" ? assignments : myAssignments).length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          No assignments found
                        </div>
                      )}
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
                <h2 className="text-lg font-semibold text-gray-900">My Schedule</h2>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700" 
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
