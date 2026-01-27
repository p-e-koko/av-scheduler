"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Menu,
  Trash2,
  Phone,
  Save,
  X,
  ArrowLeft
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { AddAvailabilityModal } from "@/components/AddAvailabilityModal"
import { EditAvailabilityModal } from "@/components/EditAvailabilityModal"
import { CalendarComponent, type CalendarEvent } from "@/components/CalendarComponent"

import {
  authAPI,
  getStoredUser,
  setStoredUser,
  formatAPIError,
  hasAnyRole,
  type User as UserType,
  userAPI,
  assignmentAPI,
  availabilityAPI,
  type Assignment,
  type Availability,
  API_BASE_URL
} from "@/lib/api"
import { initServerTime, getServerTime } from "@/lib/server-time"
import { StudentSidebar } from "@/components/StudentSidebar"
import { RejectAssignmentModal } from "@/components/RejectAssignmentModal"
import { AssignmentDetailModal } from "@/components/AssignmentDetailModal"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { LoadingDialog } from "@/components/LoadingDialog"
import { StatusDialog } from "@/components/StatusDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"

function StudentDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "assignments" | "schedule">("profile")

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['profile', 'assignments', 'schedule'].includes(tab)) {
      setActiveTab(tab as any)
    }
  }, [searchParams])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "me">("all")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [isAddAvailabilityModalOpen, setIsAddAvailabilityModalOpen] = useState(false)
  const [isEditAvailabilityModalOpen, setIsEditAvailabilityModalOpen] = useState(false)
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [selectedAssignmentForRejection, setSelectedAssignmentForRejection] = useState<Assignment | null>(null)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)

  const [selectedAssignmentForAcceptance, setSelectedAssignmentForAcceptance] = useState<Assignment | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingTitle, setLoadingTitle] = useState("Processing")
  const [loadingDescription, setLoadingDescription] = useState("Please wait while we process your request...")

  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    type: "success" | "error"
  }>({
    isOpen: false,
    title: "",
    description: "",
    type: "success"
  })

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
  // Check authentication and permissions
  useEffect(() => {
    const init = async () => {
      await initServerTime();
      await initServerTime();

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

      setPhoneNumberInput(user.phone_number || "")
      setLoading(false)
    };

    init();
  }, [])

  // Additional Profile States
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [phoneNumberInput, setPhoneNumberInput] = useState("")

  const handleUpdatePhoneNumber = async () => {
    if (!currentUser) return
    try {
      setLoadingTitle("Updating Phone Number")
      setLoadingDescription("Please wait while we update your phone number...")
      setIsProcessing(true)

      const formData = new FormData()
      formData.append('name', currentUser.name)
      formData.append('email', currentUser.email)
      formData.append('phone_number', phoneNumberInput)

      const updatedUser = await userAPI.updateUser(currentUser.id, formData)

      setCurrentUser(updatedUser.user)
      setStoredUser(updatedUser.user) // Persist to local storage
      setIsEditingPhone(false)

      setStatusDialog({
        isOpen: true,
        title: "Success",
        description: "Phone number updated successfully!",
        type: "success"
      })
    } catch (err: any) {
      console.error("Failed to update phone number", err)
      setStatusDialog({
        isOpen: true,
        title: "Error",
        description: err.message || "Failed to update phone number",
        type: "error"
      })
    } finally {
      setIsProcessing(false)
    }
  }



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
                current_page: allAssignmentsResponse.meta.current_page,
                last_page: allAssignmentsResponse.meta.last_page,
                total: allAssignmentsResponse.meta.total,
                from: allAssignmentsResponse.meta.from,
                to: allAssignmentsResponse.meta.to
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
                current_page: myAssignmentsResponse.meta.current_page,
                last_page: myAssignmentsResponse.meta.last_page,
                total: myAssignmentsResponse.meta.total,
                from: myAssignmentsResponse.meta.from,
                to: myAssignmentsResponse.meta.to
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

  const handleViewAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setIsDetailModalOpen(true)
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
      setLoadingTitle("Accepting Assignment")
      setLoadingDescription("Please wait while we accept the assignment...")
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
      setLoadingTitle("Rejecting Assignment")
      setLoadingDescription("Please wait while we reject the assignment...")
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

  const handleAddToCalendar = async (assignment: Assignment) => {
    try {
      setLoadingTitle("Adding to Calendar")
      setLoadingDescription("Please wait while we add the assignment to your Microsoft Calendar...")
      setIsProcessing(true)
      await assignmentAPI.addToCalendar(assignment.id)
      await refreshAssignments()
      setStatusDialog({
        isOpen: true,
        title: "Success",
        description: "Added to Microsoft Calendar successfully!",
        type: "success"
      })
    } catch (err: any) {
      console.error("Failed to add to calendar", err)
      if (err.message === 'Microsoft account not connected' || (err.status === 400 && err.message.includes('Microsoft'))) {
        // Fetch Microsoft Auth URL from API and redirect
        try {
          const { url } = await assignmentAPI.getMicrosoftAuthUrl();
          window.location.href = url;
        } catch (authErr) {
          console.error("Failed to get Microsoft Auth URL", authErr);
          setStatusDialog({
            isOpen: true,
            title: "Error",
            description: "Failed to initiate Microsoft connection. Please try again.",
            type: "error"
          });
        }
      } else {
        setStatusDialog({
          isOpen: true,
          title: "Error",
          description: `Failed to add to calendar: ${err.message || 'Unknown error'}`,
          type: "error"
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFromCalendar = async (assignment: Assignment) => {
    try {
      setLoadingTitle("Removing from Calendar")
      setLoadingDescription("Please wait while we remove the assignment from your Microsoft Calendar...")
      setIsProcessing(true)
      await assignmentAPI.removeFromCalendar(assignment.id)
      await refreshAssignments()
      setStatusDialog({
        isOpen: true,
        title: "Success",
        description: "Removed from Microsoft Calendar successfully!",
        type: "success"
      })
    } catch (err: any) {
      console.error("Failed to remove from calendar", err)
      if (err.message === 'Microsoft account not connected' || (err.status === 400 && err.message.includes('Microsoft'))) {
        // Fetch Microsoft Auth URL from API and redirect
        try {
          const { url } = await assignmentAPI.getMicrosoftAuthUrl();
          window.location.href = url;
        } catch (authErr) {
          console.error("Failed to get Microsoft Auth URL", authErr);
          setStatusDialog({
            isOpen: true,
            title: "Error",
            description: "Failed to initiate Microsoft connection. Please try again.",
            type: "error"
          });
        }
      } else {
        setStatusDialog({
          isOpen: true,
          title: "Error",
          description: `Failed to remove from calendar: ${err.message || 'Unknown error'}`,
          type: "error"
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate hours data
  const hoursData = React.useMemo(() => {
    if (!currentUser) return { promised: 0, worked: 0, remaining: 0, percentage: 0 }

    const promised = parseFloat(currentUser.promised_hours_per_week || '0')

    // Get start and end of current week
    const now = getServerTime()
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
      let title = slot.title || "Available"

      if (slot.status === 'unavailable') {
        color = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
        if (!slot.title) title = "Unavailable"
      } else if (slot.status === 'class') {
        color = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-white dark:border-blue-800"
        if (!slot.title) title = "Class"
      } else {
        // Available
        if (!slot.title) title = "Available"
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

  const handleBulkDelete = async (status?: 'available' | 'unavailable' | 'class') => {
    try {
      setLoadingTitle("Deleting Availability")
      setLoadingDescription("Please wait while we delete your availability slots...")
      setIsProcessing(true)

      const response = await availabilityAPI.bulkDeleteAvailability(status)

      // Refresh data
      await handleAvailabilityAdded()

      setStatusDialog({
        isOpen: true,
        title: "Success",
        description: `Deleted ${response.count} availability slots.`,
        type: "success"
      })
    } catch (err: any) {
      console.error(err)
      setStatusDialog({
        isOpen: true,
        title: "Error",
        description: err.message || "Failed to delete availability slots.",
        type: "error"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    const availabilityItem = availability.find(a => a.id.toString() === event.id)
    if (availabilityItem) {
      setSelectedAvailability(availabilityItem)
      setIsEditAvailabilityModalOpen(true)
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
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
            <div className="flex items-center gap-2">
              <NotificationDropdown />
              {activeTab === "assignments" && (
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <div className="flex items-center bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border w-full md:w-auto">
                    <Button
                      variant={assignmentFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setAssignmentFilter("all")
                        setAssignmentCurrentPage(1)
                      }}
                      className={`flex-1 md:flex-none ${assignmentFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
                      className={`flex-1 md:flex-none ${assignmentFilter === "me" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Mine
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="flex flex-col space-y-6">
              {/* Top Row - Profile Info */}
              <div className="space-y-6">
                <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      <div className="flex-shrink-0">
                        <Avatar className="h-32 w-32">
                          <AvatarImage src={currentUser.profile_picture || currentUser.profile_picture_url || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
                            {getInitials(currentUser.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 w-full space-y-6">
                        <div className="space-y-2 text-center md:text-left">
                          <h3 className="text-2xl font-bold text-foreground">{currentUser.name}</h3>
                          <div className="flex flex-col md:flex-row gap-4 text-muted-foreground justify-center md:justify-start items-center md:items-center">
                            <p>{currentUser.email}</p>
                            <span className="hidden md:inline">•</span>

                            {/* Phone Number Display & Edit */}
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {isEditingPhone ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={phoneNumberInput}
                                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                                    className="h-7 px-2 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-32 md:w-40"
                                    placeholder="Phone number"
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleUpdatePhoneNumber}
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                    title="Save"
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setIsEditingPhone(false)
                                      setPhoneNumberInput(currentUser.phone_number || "")
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <span>
                                    {currentUser.phone_number ? currentUser.phone_number : <span className="italic opacity-70 text-xs">No phone</span>}
                                  </span>
                                  <button
                                    onClick={() => setIsEditingPhone(true)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-primary"
                                    title="Edit Phone Number"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {currentUser.student_id && (
                              <>
                                <span className="hidden md:inline">•</span>
                                <span>ID: {currentUser.student_id}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                          <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Status</span>
                            <Badge className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active Student</Badge>
                          </div>
                          <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Role</span>
                            <Badge variant="secondary" className="w-fit">Student</Badge>
                          </div>
                          <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Promised Hours/Week</span>
                            <span className="text-lg font-semibold text-foreground">{currentUser.promised_hours_per_week || '0'}h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row - Availability Schedule */}
              <div className="space-y-6">
                <div className="bg-card/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-border">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-semibold flex items-center text-foreground">
                      <Calendar className="w-5 h-5 mr-2 text-primary" />
                      Availability Schedule
                    </h3>
                  </div>
                  <div className="p-0">
                    <CalendarComponent
                      events={calendarEvents}
                      view={calendarView}
                      onViewChange={setCalendarView}
                      className="border-0 shadow-none min-h-[600px]"
                      isMobile={isMobile}
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
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <CardTitle>
                      {assignmentFilter === "all" ? "All Assignments" : "My Assignments"}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10 w-full sm:w-64 bg-card/80"
                        />
                      </div>
                      <div className="flex items-center bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border w-full sm:w-auto">
                        <Button
                          variant={viewMode === "card" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("card")}
                          className={`flex-1 sm:flex-none ${viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Grid className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                          className={`flex-1 sm:flex-none ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
                        <div key={assignment.id} className={`${viewMode === "card"
                          ? "p-4 bg-muted/50 rounded-lg border border-border"
                          : "flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4 sm:gap-0"
                          }`}>
                          <div className={`${viewMode === "card" ? "space-y-3" : "flex items-center space-x-4 w-full sm:w-auto"}`}>
                            {viewMode === "card" && (
                              <div className="flex items-center justify-between">
                                <Badge className={`${assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
                                  }`}>
                                  {assignment.status}
                                </Badge>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className={`${viewMode === "card" ? "" : "flex items-center space-x-3 flex-1 min-w-0"}`}>
                              {viewMode === "list" && (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="w-5 h-5 text-blue-600 dark:text-white" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-semibold text-foreground truncate">{assignment.assignment_name}</h4>
                                <p className="text-sm text-muted-foreground truncate">{assignment.event_name} • {assignment.event_location}</p>
                                <p className="text-xs text-muted-foreground">{new Date(assignment.event_start_datetime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {viewMode === "list" && (
                              <div className="flex items-center space-x-2 sm:hidden pl-14">
                                <Badge className={`${assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
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
                              <Button
                                size="sm"
                                className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
                                onClick={() => handleViewAssignment(assignment)}
                              >
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
                                          className="flex-1 bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm"
                                          onClick={() => handleAcceptAssignment(assignment.id)}
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-red-900 hover:bg-red-950 text-white shadow-sm"
                                          onClick={() => handleRejectAssignment(assignment.id)}
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    {assignment.pivot.status === 'accepted' && (
                                      <div className="flex flex-col gap-2">
                                        <Button
                                          size="sm"
                                          className="w-full bg-red-900 hover:bg-red-950 text-white shadow-sm"
                                          onClick={() => handleRejectAssignment(assignment.id)}
                                        >
                                          Reject
                                        </Button>

                                        {/* Microsoft Calendar Button */}
                                        {assignment.pivot.microsoft_event_id ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                            onClick={() => handleRemoveFromCalendar(assignment)}
                                            disabled={isProcessing}
                                          >
                                            <Calendar className="w-3 h-3 mr-2" />
                                            Remove from Calendar
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            onClick={() => handleAddToCalendar(assignment)}
                                            disabled={isProcessing}
                                          >
                                            <Calendar className="w-3 h-3 mr-2" />
                                            Add to Calendar
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                    {assignment.pivot.status === 'rejected' && (
                                      <Button
                                        size="sm"
                                        className="flex-1 bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm"
                                        onClick={() => handleAcceptAssignment(assignment.id)}
                                      >
                                        Accept
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-center text-muted-foreground">
                                    My Status: <span className={`font-medium capitalize ${assignment.pivot.status === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' :
                                      assignment.pivot.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' :
                                        'text-amber-600 dark:text-amber-400'
                                      }`}>{assignment.pivot.status}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {viewMode === "list" && (
                            <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                              <div className="hidden sm:flex mr-2">
                                <Badge className={`${assignment.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  assignment.status === 'confirmed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-white'
                                  }`}>
                                  {assignment.status}
                                </Badge>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => handleViewAssignment(assignment)}
                              >
                                View Details
                              </Button>

                              {assignment.pivot && assignment.status !== 'complete' && (
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                  {assignment.pivot.status !== 'accepted' && assignment.pivot.status !== 'rejected' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="flex-1 sm:flex-none bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm"
                                        onClick={() => handleAcceptAssignment(assignment.id)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="flex-1 sm:flex-none bg-red-900 hover:bg-red-950 text-white shadow-sm"
                                        onClick={() => handleRejectAssignment(assignment.id)}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {assignment.pivot.status === 'accepted' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="flex-1 sm:flex-none bg-red-900 hover:bg-red-950 text-white shadow-sm"
                                        onClick={() => handleRejectAssignment(assignment.id)}
                                      >
                                        Reject
                                      </Button>

                                      {assignment.pivot.microsoft_event_id ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 sm:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                          onClick={() => handleRemoveFromCalendar(assignment)}
                                          disabled={isProcessing}
                                        >
                                          <Calendar className="w-3 h-3 md:mr-2" />
                                          <span className="hidden md:inline">From Calendar</span>
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                          onClick={() => handleAddToCalendar(assignment)}
                                          disabled={isProcessing}
                                        >
                                          <Calendar className="w-3 h-3 md:mr-2" />
                                          <span className="hidden md:inline">To Calendar</span>
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {assignment.pivot.status === 'rejected' && (
                                    <Button
                                      size="sm"
                                      className="flex-1 sm:flex-none bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm"
                                      onClick={() => handleAcceptAssignment(assignment.id)}
                                    >
                                      Accept
                                    </Button>
                                  )}
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
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 sm:gap-0">
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
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isMobile ? "Delete" : "Bulk Delete"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkDelete('class')} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20">
                        Delete all class
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkDelete('available')} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20">
                        Delete all available
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkDelete('unavailable')} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20">
                        Delete all unavailable
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary-dark text-primary-foreground"
                    onClick={() => setIsAddAvailabilityModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {isMobile ? "Add" : "Add Availability"}
                  </Button>
                </div>
              </div>

              <CalendarComponent
                events={calendarEvents}
                view={calendarView}
                onViewChange={setCalendarView}
                onEventClick={handleEventClick}
                isMobile={isMobile}
                className="min-h-[600px]"
              />
            </div>
          )}
        </main>
      </div >
      <AddAvailabilityModal
        isOpen={isAddAvailabilityModalOpen}
        onClose={() => setIsAddAvailabilityModalOpen(false)}
        onSuccess={handleAvailabilityAdded}
        existingAvailability={availability}
      />
      <EditAvailabilityModal
        isOpen={isEditAvailabilityModalOpen}
        onClose={() => setIsEditAvailabilityModalOpen(false)}
        onSuccess={handleAvailabilityAdded}
        availability={selectedAvailability}
        existingAvailability={availability}
      />
      <AssignmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        assignment={selectedAssignment}
      />
      {
        selectedAssignmentForRejection && (
          <RejectAssignmentModal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectModalOpen(false)}
            onConfirm={confirmRejectAssignment}
            assignmentName={selectedAssignmentForRejection.assignment_name}
          />
        )
      }
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
        title={loadingTitle}
        description={loadingDescription}
      />
      <StatusDialog
        isOpen={statusDialog.isOpen}
        onClose={() => setStatusDialog(prev => ({ ...prev, isOpen: false }))}
        title={statusDialog.title}
        description={statusDialog.description}
        type={statusDialog.type}
      />
    </div >
  )
}

export default function ProtectedStudentDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['student', 'admin']}>
      <StudentDashboard />
    </RoleProtectedRoute>
  )
}
