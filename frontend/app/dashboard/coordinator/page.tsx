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
  XCircle,
  AlertCircle,
  Eye
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { CreateAssignmentModal } from "@/components/CreateAssignmentModal"
import { PositionModal } from "@/components/PositionModal"
import { AssignmentDetailModal } from "@/components/AssignmentDetailModal"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { CoordinatorSidebar } from "@/components/CoordinatorSidebar"

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
import { ModeToggle } from "@/components/mode-toggle"

function CoordinatorDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"assignments" | "students" | "schedules" | "positions">("assignments")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [isDeleteAssignmentConfirmationOpen, setIsDeleteAssignmentConfirmationOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all')
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [studentFilter, setStudentFilter] = useState<string>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Position Management State
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false)
  const [positionToDelete, setPositionToDelete] = useState<string | null>(null)

  // Student View State
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [studentPagination, setStudentPagination] = useState<any>(null)
  const [studentCurrentPage, setStudentCurrentPage] = useState(1)

  // Availability View State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })

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
        case 'assignments': {
          const [assignmentsResponse, positionsData, studentsResponse] = await Promise.all([
            assignmentAPI.getAssignments({ per_page: 50 }),
            positionAPI.getPositions(),
            userAPI.getUsers({ role: 'student', per_page: 100 })
          ])
          setAssignments(assignmentsResponse.data)
          setPositions(positionsData.positions)
          setStudents(studentsResponse.data)
          
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
        }

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
          const availabilityResponse = await availabilityAPI.getAvailability({ 
            per_page: 100,
            date: selectedDate
          })
          setAvailability(availabilityResponse.data)
          break

        case 'positions':
          const positionsResponse = await positionAPI.getPositions()
          setPositions(positionsResponse.positions)
          break
      }
    } catch (err) {
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleViewAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setIsDetailModalOpen(true)
  }

  const handleCreateAssignment = () => {
    setEditingAssignment(null)
    setIsCreateAssignmentModalOpen(true)
  }

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setIsCreateAssignmentModalOpen(true)
  }

  const handleDeleteAssignment = (id: number) => {
    setAssignmentToDelete(id)
    setIsDeleteAssignmentConfirmationOpen(true)
  }

  const executeDeleteAssignment = async () => {
    if (!assignmentToDelete) return

    try {
      await assignmentAPI.deleteAssignment(assignmentToDelete)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to delete assignment")
    } finally {
      setIsDeleteAssignmentConfirmationOpen(false)
      setAssignmentToDelete(null)
    }
  }

  const handleCreatePosition = () => {
    setEditingPosition(null)
    setIsPositionModalOpen(true)
  }

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position)
    setIsPositionModalOpen(true)
  }

  const handleDeletePosition = (id: string) => {
    setPositionToDelete(id)
    setIsDeleteConfirmationOpen(true)
  }

  const executeDeletePosition = async () => {
    if (!positionToDelete) return

    try {
      await positionAPI.deletePosition(positionToDelete)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to delete position")
    } finally {
      setIsDeleteConfirmationOpen(false)
      setPositionToDelete(null)
    }
  }

  // Initial load and tab change
  useEffect(() => {
    fetchData()
  }, [currentUser, activeTab, selectedDate])

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

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-background">
      <CoordinatorSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUser}
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
                {activeTab === "assignments" && "Assignment Management"}
                {activeTab === "students" && "View Students"}
                {activeTab === "schedules" && "Student Availability"}
                {activeTab === "positions" && "Position Management"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "assignments" && "Create and manage assignments for students"}
                {activeTab === "students" && "View and manage student information"}
                {activeTab === "schedules" && "Check who is available at specific times"}
                {activeTab === "positions" && "Manage available positions and roles"}
              </p>
            </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Assignment Management Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
                      <Button 
                        onClick={handleCreateAssignment}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Assignment
                      </Button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Filter Buttons */}
                      <div className="flex items-center bg-muted p-1 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignmentFilter('all')}
                          className={`transition-all duration-200 ${
                            assignmentFilter === 'all' 
                              ? 'bg-background text-primary dark:text-white shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                          }`}
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignmentFilter('pending')}
                          className={`transition-all duration-200 ${
                            assignmentFilter === 'pending' 
                              ? 'bg-background text-primary dark:text-white shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                          }`}
                        >
                          Pending
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignmentFilter('confirmed')}
                          className={`transition-all duration-200 ${
                            assignmentFilter === 'confirmed' 
                              ? 'bg-background text-primary dark:text-white shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                          }`}
                        >
                          Confirmed
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignmentFilter('completed')}
                          className={`transition-all duration-200 ${
                            assignmentFilter === 'completed' 
                              ? 'bg-background text-primary dark:text-white shadow-sm font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                          }`}
                        >
                          Completed
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground max-w-[150px]"
                          value={studentFilter}
                          onChange={(e) => setStudentFilter(e.target.value)}
                        >
                          <option value="all">All Students</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>

                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                          value={positionFilter}
                          onChange={(e) => setPositionFilter(e.target.value)}
                        >
                          <option value="all">All Positions</option>
                          {positions.map((pos) => (
                            <option key={pos.id} value={pos.name}>
                              {pos.name}
                            </option>
                          ))}
                        </select>

                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search assignments..."
                            className="pl-10 w-64 bg-background/80 backdrop-blur-xl border-input focus-visible:ring-0 focus-visible:border-primary"
                            value={assignmentSearchQuery}
                            onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-destructive space-y-4">
                      <p>{error}</p>
                      {error.includes("Session expired") && (
                        <Button onClick={() => router.push('/login')}>Log in again</Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(assignments || [])
                        .filter(assignment => {
                          // Filter by status
                          if (assignmentFilter !== 'all') {
                            if (assignmentFilter === 'completed' && assignment.status !== 'complete') return false;
                            if (assignmentFilter === 'confirmed' && assignment.status !== 'confirmed') return false;
                            if (assignmentFilter === 'pending' && assignment.status !== 'pending') return false;
                          }

                          // Filter by position
                          if (positionFilter !== 'all') {
                            const hasPosition = assignment.users?.some(u => (u as any).pivot?.position === positionFilter);
                            if (!hasPosition) return false;
                          }

                          // Filter by student
                          if (studentFilter !== 'all') {
                            const hasStudent = assignment.users?.some(u => u.id.toString() === studentFilter);
                            if (!hasStudent) return false;
                          }
                          
                          // Filter by search query
                          if (assignmentSearchQuery) {
                            const query = assignmentSearchQuery.toLowerCase();
                            return (
                              assignment.assignment_name.toLowerCase().includes(query) ||
                              assignment.event_name.toLowerCase().includes(query) ||
                              assignment.event_location.toLowerCase().includes(query)
                            );
                          }
                          
                          return true;
                        })
                        .map((assignment, index) => (
                        <div key={`${assignment.id}-${index}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-primary dark:text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{assignment.assignment_name}</h4>
                              <p className="text-sm text-muted-foreground">{assignment.event_name} • {new Date(assignment.event_start_datetime).toLocaleDateString('en-US')}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-2 py-0.5 border-none ${
                                assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                assignment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white' :
                                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}
                            >
                              {assignment.status}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAssignment(assignment);
                              }} 
                              className="text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAssignment(assignment);
                              }} 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-white dark:hover:bg-blue-900/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAssignment(assignment.id);
                              }} 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {assignments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No assignments found</div>
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
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-card/80 backdrop-blur-xl border-border focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading students...</div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : (
                <>
                  {viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(students || []).map((student) => (
                        <Card 
                          key={student.id} 
                          className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all cursor-pointer h-32"
                          onClick={() => router.push(`/student/${student.id}`)}
                        >
                          <CardContent className="p-4 h-full">
                            <div className="flex items-center space-x-4 h-full">
                              <Avatar className="h-16 w-16 flex-shrink-0">
                                <AvatarImage src={student.profile_picture_url || ""} />
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
                                    {student.email_verified_at ? (
                                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                    )}
                                  </div>
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
                              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(students || []).map((student) => (
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
                                    <Badge variant="outline" className={`text-xs w-fit ${
                                      (Number(student.remaining_hours_this_week) || 0) > 0 
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
                                    {student.email_verified_at ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/student/${student.id}`)
                                    }}
                                    className="text-primary hover:text-primary-dark hover:bg-primary/10"
                                  >
                                    View Details
                                  </Button>
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
                      <p className="text-sm text-muted-foreground">
                        Showing {studentPagination.from} to {studentPagination.to} of {studentPagination.total} results
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={studentCurrentPage === 1}
                          onClick={() => setStudentCurrentPage(studentCurrentPage - 1)}
                          className="bg-card/80 backdrop-blur-xl border-border"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {studentCurrentPage} of {studentPagination.last_page}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={studentCurrentPage === studentPagination.last_page}
                          onClick={() => setStudentCurrentPage(studentCurrentPage + 1)}
                          className="bg-card/80 backdrop-blur-xl border-border"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {students.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">No students found</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Schedules Tab */}
          {activeTab === "schedules" && (
            <div className="space-y-6">
              <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-foreground font-bold">Daily Availability View</CardTitle>
                  <div className="flex items-center bg-card rounded-lg border border-border shadow-sm p-1">
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

                    <div className="flex items-center px-2">
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
                            <div key={hour} className="flex border-b border-border py-3 last:border-0">
                              <div className="w-20 flex-shrink-0 font-medium text-muted-foreground pt-2">
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
                                            <AvatarImage src={student.profile_picture_url || ""} />
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
                                  <div className="text-sm text-muted-foreground italic pt-2">No students available</div>
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

          {/* Positions Tab */}
          {activeTab === "positions" && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading positions...</div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={handleCreatePosition} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" /> Add Position
                    </Button>
                  </div>
                  <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(positions || []).map((position) => (
                          <tr key={position.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-medium text-foreground">{position.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-muted-foreground line-clamp-1">{position.description || 'No description'}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={position.is_active ? "secondary" : "outline"}>
                                {position.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditPosition(position)} className="h-8 w-8 p-0">
                                  <Edit className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeletePosition(position.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(positions || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No positions found</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
      <CreateAssignmentModal 
        isOpen={isCreateAssignmentModalOpen} 
        onClose={() => setIsCreateAssignmentModalOpen(false)} 
        onAssignmentCreated={fetchData}
        assignmentToEdit={editingAssignment}
      />
      <AssignmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        assignment={selectedAssignment}
      />
      <PositionModal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        onPositionSaved={fetchData}
        positionToEdit={editingPosition}
      />
      <ConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        onClose={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={executeDeletePosition}
        title="Delete Position"
        description="Are you sure you want to delete this position? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmationDialog
        isOpen={isDeleteAssignmentConfirmationOpen}
        onClose={() => setIsDeleteAssignmentConfirmationOpen(false)}
        onConfirm={executeDeleteAssignment}
        title="Delete Assignment"
        description="Are you sure you want to delete this assignment? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
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
