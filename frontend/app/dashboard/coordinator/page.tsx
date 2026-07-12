"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  AlertCircle,
  Eye,
  Check,
  XCircle,
  User as UserIcon
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
import { CustomerContactModal } from "@/components/CustomerContactModal"
import { BookingCard } from "@/components/BookingCard"
import { CancelBookingDialog } from "@/components/CancelBookingDialog"

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
  mediaBookingAPI,
  type Assignment,
  type Availability,
  type Position,
  type AssignmentsQueryParams,
  type UsersQueryParams,
  type MediaBooking,
} from "@/lib/api"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import { DailyAvailabilityView } from "@/components/DailyAvailabilityView"

function CoordinatorDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"assignments" | "students" | "schedules" | "positions" | "recycle-bin">("assignments")

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['assignments', 'students', 'schedules', 'positions', 'recycle-bin'].includes(tab)) {
      setActiveTab(tab as any)
    }
    // Honor ?filter=... deep-link from booking notifications (e.g. filter=to_assign)
    const filter = searchParams.get('filter')
    if (filter && ['all', 'booking', 'to_assign', 'pending', 'confirmed', 'complete'].includes(filter)) {
      setAssignmentFilter(filter as any)
      setAssignmentCurrentPage(1)
    }
  }, [searchParams])

  const handleTabChange = (tab: "assignments" | "students" | "schedules" | "positions" | "recycle-bin") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/coordinator?${params.toString()}`)
    setActiveTab(tab)
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [isDeleteAssignmentConfirmationOpen, setIsDeleteAssignmentConfirmationOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'booking' | 'to_assign' | 'pending' | 'confirmed' | 'complete'>('all')
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [studentFilter, setStudentFilter] = useState<string>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Customer Contact via media booking
  const [contactBooking, setContactBooking] = useState<MediaBooking | null>(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  // Booking approve/reject actions
  const [rejectingAssignment, setRejectingAssignment] = useState<Assignment | null>(null)
  const [bookingActionLoading, setBookingActionLoading] = useState(false)

  // Recycle Bin State
  const [trashedAssignments, setTrashedAssignments] = useState<Assignment[]>([])
  const [isRestoreConfirmationOpen, setIsRestoreConfirmationOpen] = useState(false)
  const [isForceDeleteConfirmationOpen, setIsForceDeleteConfirmationOpen] = useState(false)
  const [assignmentToRestore, setAssignmentToRestore] = useState<number | null>(null)
  const [assignmentToForceDelete, setAssignmentToForceDelete] = useState<number | null>(null)

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

  // Assignment Pagination
  const [assignmentPagination, setAssignmentPagination] = useState<any>(null)
  const [assignmentCurrentPage, setAssignmentCurrentPage] = useState(1)

  // Recycle Bin Pagination
  const [recycleBinPagination, setRecycleBinPagination] = useState<any>(null)
  const [recycleBinCurrentPage, setRecycleBinCurrentPage] = useState(1)

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
            assignmentAPI.getAssignments({
              per_page: 10,
              page: assignmentCurrentPage,
              search: assignmentSearchQuery || undefined,
              status: assignmentFilter !== 'all' ? assignmentFilter : undefined
            }),
            positionAPI.getPositions(),
            userAPI.getUsers({ role: 'student', per_page: 100 })
          ])
          setAssignments(assignmentsResponse.data)
          setAssignmentPagination({
            current_page: assignmentsResponse.meta.current_page,
            last_page: assignmentsResponse.meta.last_page,
            total: assignmentsResponse.meta.total,
            from: assignmentsResponse.meta.from,
            to: assignmentsResponse.meta.to
          })
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
            per_page: 1000
          })
          setStudents(studentsResponse.data)
          // setStudentPagination is not needed for client-side
          break

        case 'schedules':
          const [availabilityResponse, studentsResponseSchedules] = await Promise.all([
            availabilityAPI.getAvailability({
              per_page: 100,
              date: selectedDate
            }),
            userAPI.getUsers({ role: 'student', per_page: 100 })
          ])
          setAvailability(availabilityResponse.data)
          setStudents(studentsResponseSchedules.data)
          break

        case 'positions':
          const positionsResponse = await positionAPI.getPositions()
          setPositions(positionsResponse.positions)
          break

        case 'recycle-bin':
          const trashedResponse = await assignmentAPI.getTrashedAssignments({
            per_page: 10,
            page: recycleBinCurrentPage
          })
          setTrashedAssignments(trashedResponse.data)
          setRecycleBinPagination({
            current_page: trashedResponse.meta.current_page,
            last_page: trashedResponse.meta.last_page,
            total: trashedResponse.meta.total,
            from: trashedResponse.meta.from,
            to: trashedResponse.meta.to
          })
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

  // ── Booking approve / reject / contact handlers ────────────────────────────────
  const handleApproveBooking = async (assignment: Assignment) => {
    const booking = assignment.mediaBooking
    if (!booking) return
    setBookingActionLoading(true)
    try {
      await mediaBookingAPI.approveBooking(booking.id)
      setBookingActionLoading(false)
      setIsDetailModalOpen(false)
      fetchData()
    } catch (err) {
      setError(formatAPIError(err))
      setBookingActionLoading(false)
    }
  }

  const handleRejectBooking = (assignment: Assignment) => {
    setRejectingAssignment(assignment)
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingAssignment?.mediaBooking) return
    setBookingActionLoading(true)
    try {
      await mediaBookingAPI.rejectBooking(rejectingAssignment.mediaBooking.id, reason)
      setRejectingAssignment(null)
      setBookingActionLoading(false)
      setIsDetailModalOpen(false)
      fetchData()
    } catch (err) {
      setError(formatAPIError(err))
      setBookingActionLoading(false)
    }
  }

  const handleContactCustomer = (assignment: Assignment) => {
    const booking = assignment.mediaBooking
    if (booking) {
      setContactBooking(booking)
      setIsContactModalOpen(true)
    }
  }

  const handleCreateAssignment = () => {
    setEditingAssignment(null)
    setIsCreateAssignmentModalOpen(true)
  }

  const handleRestoreAssignment = async () => {
    if (!assignmentToRestore) return
    try {
      await assignmentAPI.restoreAssignment(assignmentToRestore)
      setTrashedAssignments(prev => prev.filter(a => a.id !== assignmentToRestore))
      setIsRestoreConfirmationOpen(false)
      setAssignmentToRestore(null)
    } catch (error) {
      console.error('Failed to restore assignment:', error)
      setError('Failed to restore assignment')
    }
  }

  const handleForceDeleteAssignment = async () => {
    if (!assignmentToForceDelete) return
    try {
      await assignmentAPI.forceDeleteAssignment(assignmentToForceDelete)
      setTrashedAssignments(prev => prev.filter(a => a.id !== assignmentToForceDelete))
      setIsForceDeleteConfirmationOpen(false)
      setAssignmentToForceDelete(null)
    } catch (error) {
      console.error('Failed to force delete assignment:', error)
      setError('Failed to force delete assignment')
    }
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

  // Assignment pagination change
  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchData()
    }
  }, [assignmentCurrentPage, assignmentFilter])

  // Assignment search debounce
  useEffect(() => {
    if (activeTab === 'assignments') {
      const timeout = setTimeout(() => {
        if (assignmentCurrentPage !== 1) {
          setAssignmentCurrentPage(1)
        } else {
          fetchData()
        }
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [assignmentSearchQuery])

  // Recycle Bin pagination change
  useEffect(() => {
    if (activeTab === 'recycle-bin') {
      fetchData()
    }
  }, [recycleBinCurrentPage])

  // Client-side Filter and Sort for Students
  const filteredStudents = React.useMemo(() => {
    let result = [...students];

    if (studentSearchQuery) {
      const query = studentSearchQuery.toLowerCase();
      result = result.filter(student =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [students, studentSearchQuery]);

  const itemsPerPage = 10;
  const paginatedStudents = React.useMemo(() => {
    const start = (studentCurrentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, studentCurrentPage]);

  // Reset page when search changes is handled by useEffect at line 363 (but we need to verify it logic)
  // Existing debounce logic sets page to 1. Which is fine.

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
        onTabChange={handleTabChange}
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
            <NotificationDropdown />
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
                      <div className="grid grid-cols-2 sm:flex items-center bg-muted p-1 rounded-lg gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('all')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'all'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('booking')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'booking'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          Booking
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('to_assign')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'to_assign'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          To Assign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('pending')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'pending'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          Pending
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('confirmed')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'confirmed'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          Confirmed
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentFilter('complete')
                            setAssignmentCurrentPage(1)
                          }}
                          className={`transition-all duration-200 w-full sm:w-auto ${assignmentFilter === 'complete'
                            ? 'bg-background text-primary dark:text-white shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                          Completed
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground w-full sm:w-auto max-w-none sm:max-w-[150px]"
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
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground w-full sm:w-auto max-w-none sm:max-w-[150px]"
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

                        <div className="relative w-full sm:w-auto">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search assignments..."
                            className="pl-10 w-full sm:w-64 bg-background/80 backdrop-blur-xl border-input focus-visible:ring-0 focus-visible:border-primary"
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
                            if (assignmentFilter === 'booking' && assignment.status !== 'booking') return false;
                            if (assignmentFilter === 'to_assign' && assignment.status !== 'to_assign') return false;
                            if (assignmentFilter === 'complete' && assignment.status !== 'complete') return false;
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
                          <div
                            key={`${assignment.id}-${index}`}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4 cursor-pointer hover:bg-muted/70 transition-colors"
                            onClick={() => handleViewAssignment(assignment)}
                          >
                            <div className="flex items-center space-x-4 w-full md:w-auto">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="w-5 h-5 text-primary dark:text-white" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-foreground truncate">{assignment.assignment_name}</h4>
                                <p className="text-sm text-muted-foreground truncate">{assignment.event_name} • {new Date(assignment.event_start_datetime).toLocaleDateString('en-US')}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{((new Date(assignment.event_end_datetime).getTime() - new Date(assignment.event_start_datetime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h</span>
                              </div>
                              <Badge
                                variant="secondary"
                                className={`text-xs px-2 py-0.5 border-none ${assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  assignment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white' :
                                  assignment.status === 'booking' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' :
                                  assignment.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                  }`}
                              >
                                {assignment.status === 'booking' ? 'Booking' : assignment.status}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {/* Booking action buttons: Approve / Reject / Contact */}
                                {assignment.status === 'booking' && assignment.mediaBooking && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApproveBooking(assignment)
                                      }}
                                      disabled={bookingActionLoading}
                                      className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRejectBooking(assignment)
                                      }}
                                      disabled={bookingActionLoading}
                                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                    >
                                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleContactCustomer(assignment)
                                      }}
                                      className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                                    >
                                      <UserIcon className="w-3.5 h-3.5 mr-1" /> Contact
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewAssignment(assignment)
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditAssignment(assignment)
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteAssignment(assignment.id)
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      {assignments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No assignments found</div>
                      )}
                    </div>
                  )}

                  {/* Assignment Pagination */}
                  {assignmentPagination && assignmentPagination.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
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
                </div>
              </div>
            </div>
          )}

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
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-10 w-full md:w-64 bg-card/80 backdrop-blur-xl border-border focus:border-primary"
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
                            {paginatedStudents.map((student) => (
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

                  {students.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">No students found</div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "schedules" && (
            <div className="space-y-6">
              <DailyAvailabilityView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                students={students}
                availability={availability}
                loading={loading}
              />
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
                    <div className="overflow-x-auto">
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
                                    <MapPin className="w-4 h-4 text-primary dark:text-white" />
                                  </div>
                                  <span className="font-medium text-foreground">{position.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-muted-foreground line-clamp-1">{position.description || 'No description'}</p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={position.is_active ? "secondary" : "outline"}
                                  className={position.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-none" : ""}
                                >
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
                    </div>
                    {(positions || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No positions found</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recycle Bin Tab */}
          {activeTab === "recycle-bin" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Recycle Bin</h2>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading trashed assignments...</div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : (
                <>
                  <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Deleted At</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(trashedAssignments || []).map((assignment) => (
                            <tr key={assignment.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </div>
                                  <span className="font-medium text-foreground">{assignment.assignment_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{assignment.event_name}</span>
                                  <span className="text-xs text-muted-foreground">{new Date(assignment.event_start_datetime).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-muted-foreground">
                                  {assignment.deleted_at ? new Date(assignment.deleted_at).toLocaleDateString() : 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAssignmentToRestore(assignment.id)
                                      setIsRestoreConfirmationOpen(true)
                                    }}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                  >
                                    Restore
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setAssignmentToForceDelete(assignment.id)
                                      setIsForceDeleteConfirmationOpen(true)
                                    }}
                                  >
                                    Delete Forever
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(trashedAssignments || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No trashed assignments found</div>
                    )}
                  </div>

                  {/* Recycle Bin Pagination */}
                  {recycleBinPagination && recycleBinPagination.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                      <div className="text-sm text-gray-500">
                        Showing {recycleBinPagination.from} to {recycleBinPagination.to} of {recycleBinPagination.total} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecycleBinCurrentPage(p => Math.max(1, p - 1))}
                          disabled={recycleBinCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm font-medium">
                          Page {recycleBinCurrentPage} of {recycleBinPagination.last_page}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecycleBinCurrentPage(p => Math.min(recycleBinPagination.last_page, p + 1))}
                          disabled={recycleBinCurrentPage === recycleBinPagination.last_page}
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
        onApproveBooking={selectedAssignment?.status === 'booking' ? () => handleApproveBooking(selectedAssignment) : undefined}
        onRejectBooking={selectedAssignment?.status === 'booking' ? () => handleRejectBooking(selectedAssignment) : undefined}
        onContactCustomer={selectedAssignment?.mediaBooking ? () => handleContactCustomer(selectedAssignment) : undefined}
        bookingActionLoading={bookingActionLoading}
      />
      <CustomerContactModal
        booking={contactBooking}
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setContactBooking(null) }}
      />
      <CancelBookingDialog
        isOpen={!!rejectingAssignment}
        onClose={() => setRejectingAssignment(null)}
        onConfirm={handleRejectConfirm}
        loading={bookingActionLoading}
        title="Reject Booking"
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
      <ConfirmationDialog
        isOpen={isRestoreConfirmationOpen}
        onClose={() => setIsRestoreConfirmationOpen(false)}
        onConfirm={handleRestoreAssignment}
        title="Restore Assignment"
        description="Are you sure you want to restore this assignment? It will be moved back to the active assignments list."
        confirmText="Restore"
        cancelText="Cancel"
      />
      <ConfirmationDialog
        isOpen={isForceDeleteConfirmationOpen}
        onClose={() => setIsForceDeleteConfirmationOpen(false)}
        onConfirm={handleForceDeleteAssignment}
        title="Delete Forever"
        description="Are you sure you want to permanently delete this assignment? This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Cancel"
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
