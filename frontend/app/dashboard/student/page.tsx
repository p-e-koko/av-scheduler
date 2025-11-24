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
import { Switch } from "@/components/ui/switch"

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

export default function StudentDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "assignments" | "schedule">("profile")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "me">("all")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")

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
            <div className="space-y-6">
              {/* Profile Header Card */}
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    {/* Profile Picture */}
                    <div className="relative">
                      <Avatar className="h-24 w-24 md:h-32 md:w-32">
                        <AvatarImage src={currentUser.profile_picture_url || ""} />
                        <AvatarFallback className="bg-primary text-white font-semibold text-2xl">
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
                    
                    {/* Profile Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentUser.name}</h2>
                        <p className="text-gray-600">{currentUser.student_id}</p>
                        <p className="text-sm text-gray-500">{currentUser.email}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-primary/10 text-primary">Student</Badge>
                        <Badge className="bg-green-100 text-green-800">
                          {currentUser.promised_hours_per_week || '0'}h promised/week
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button className="bg-primary hover:bg-primary-dark">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline">
                          <Star className="w-4 h-4 mr-2" />
                          Update Skills
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Section */}
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    My Skills
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Skill
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">Audio Equipment</Badge>
                    <Badge variant="secondary" className="text-sm px-3 py-1">Video Production</Badge>
                    <Badge variant="secondary" className="text-sm px-3 py-1">Live Streaming</Badge>
                    <Badge variant="secondary" className="text-sm px-3 py-1">Lighting Setup</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Hours Overview */}
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Weekly Hours Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{currentUser.promised_hours_per_week || '0'}</p>
                      <p className="text-sm text-gray-600">Promised Hours</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{currentUser.hours_worked_this_week || '0'}</p>
                      <p className="text-sm text-gray-600">Worked This Week</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{currentUser.remaining_hours_this_week || '0'}</p>
                      <p className="text-sm text-gray-600">Remaining Hours</p>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{currentUser.hours_completion_percentage || '0'}%</p>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
            <div className="space-y-6">
              {/* Mobile Calendar View Toggle */}
              {isMobile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30">
                    <Button
                      variant={calendarView === "day" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCalendarView("day")}
                      className="text-xs"
                    >
                      Day
                    </Button>
                    <Button
                      variant={calendarView === "week" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCalendarView("week")}
                      className="text-xs"
                    >
                      Week
                    </Button>
                    <Button
                      variant={calendarView === "month" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCalendarView("month")}
                      className="text-xs"
                    >
                      Month
                    </Button>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}

              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>My Availability</CardTitle>
                    {!isMobile && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Filter className="w-4 h-4 mr-1" />
                          Filter
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Availability
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile-optimized calendar view */}
                  {isMobile ? (
                    <div className="space-y-4">
                      {calendarView === "day" && (
                        <div className="space-y-2">
                          <div className="text-center py-2 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-blue-900">Today - Dec 14, 2024</h3>
                          </div>
                          <div className="space-y-2">
                            <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                              <p className="font-semibold text-green-900">9:00 AM - 1:00 PM</p>
                              <p className="text-sm text-green-700">Available</p>
                            </div>
                            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                              <p className="font-semibold text-red-900">2:00 PM - 6:00 PM</p>
                              <p className="text-sm text-red-700">Not Available - Class</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {calendarView === "week" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-600">
                            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 7 }, (_, i) => (
                              <div key={i} className="aspect-square p-1 border rounded text-xs">
                                <div className="font-semibold">{9 + i}</div>
                                <div className={`w-full h-2 rounded mt-1 ${
                                  i % 3 === 0 ? 'bg-green-400' : i % 3 === 1 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {calendarView === "month" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-600">
                            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 35 }, (_, i) => (
                              <div key={i} className="aspect-square p-1 border rounded text-xs">
                                <div className="font-semibold">{(i % 31) + 1}</div>
                                {i < 25 && (
                                  <div className={`w-full h-1 rounded mt-1 ${
                                    i % 4 === 0 ? 'bg-green-400' : i % 4 === 1 ? 'bg-yellow-400' : 'bg-red-400'
                                  }`}></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Desktop calendar view */
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-2 text-center">
                        <div className="font-semibold text-gray-600">Monday</div>
                        <div className="font-semibold text-gray-600">Tuesday</div>
                        <div className="font-semibold text-gray-600">Wednesday</div>
                        <div className="font-semibold text-gray-600">Thursday</div>
                        <div className="font-semibold text-gray-600">Friday</div>
                        <div className="font-semibold text-gray-600">Saturday</div>
                        <div className="font-semibold text-gray-600">Sunday</div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }, (_, i) => (
                          <div key={i} className="p-4 border rounded-lg min-h-32">
                            <div className="font-semibold text-sm text-gray-900">{9 + i}</div>
                            <div className="space-y-1 mt-2">
                              <div className="text-xs p-1 bg-green-100 text-green-800 rounded">
                                9:00-13:00 Available
                              </div>
                              {i < 3 && (
                                <div className="text-xs p-1 bg-red-100 text-red-800 rounded">
                                  14:00-18:00 Busy
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions for Mobile */}
              {isMobile && (
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="py-6">
                    <Clock className="w-6 h-6 mr-2" />
                    <div className="text-left">
                      <div className="font-semibold">Quick Add</div>
                      <div className="text-xs text-gray-500">Set availability</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="py-6">
                    <CheckCircle className="w-6 h-6 mr-2" />
                    <div className="text-left">
                      <div className="font-semibold">View Schedule</div>
                      <div className="text-xs text-gray-500">See assignments</div>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
