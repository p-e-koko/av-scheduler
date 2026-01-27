"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Calendar, MapPin, FileText, Clock, Type, Plus, Trash2, UserPlus, AlertCircle, ChevronDown, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  assignmentAPI,
  userAPI,
  positionAPI,
  availabilityAPI,
  formatAPIError,
  type User,
  type Position,
  type Availability,
  type Assignment
} from "@/lib/api"

interface CreateAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssignmentCreated: () => void
  assignmentToEdit?: Assignment | null
}

interface Assignee {
  user: User
  position: string
}

export function CreateAssignmentModal({ isOpen, onClose, onAssignmentCreated, assignmentToEdit }: CreateAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [eventName, setEventName] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [description, setDescription] = useState("")

  // Date/Time State
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")

  // Assignee Management State
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [selectedPosition, setSelectedPosition] = useState<string>("")
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Calculate dropdown position
  useEffect(() => {
    if (isStudentDropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Assume dropdown max height is around 250px (max-h-60 is 15rem = 240px)
      if (spaceBelow < 250 && spaceAbove > 250) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [isStudentDropdownOpen])

  // Generate time slots
  const timeSlots: string[] = []
  for (let i = 0; i <= 23; i++) {
    const hour = i.toString().padStart(2, '0')
    timeSlots.push(`${hour}:00`)
    timeSlots.push(`${hour}:30`)
  }

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      const fetchInitialData = async () => {
        try {
          const [studentsRes, positionsRes] = await Promise.all([
            userAPI.getUsers({ role: 'student', per_page: 100 }),
            positionAPI.getPositions()
          ])
          setStudents(studentsRes.data)
          setPositions(positionsRes.positions || [])

          // Pre-fill form if editing
          if (assignmentToEdit) {
            setEventName(assignmentToEdit.event_name)
            setEventLocation(assignmentToEdit.event_location)
            setDescription(assignmentToEdit.description || "")

            // Parse dates
            const start = new Date(assignmentToEdit.event_start_datetime)
            const end = new Date(assignmentToEdit.event_end_datetime)

            // Helper to format local date as YYYY-MM-DD
            const formatLocalDate = (d: Date) => {
              const year = d.getFullYear()
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }

            setStartDate(formatLocalDate(start))
            setStartTime(start.toTimeString().slice(0, 5))
            setEndDate(formatLocalDate(end))
            setEndTime(end.toTimeString().slice(0, 5))

            // Set assignees if available in the assignment object
            if (assignmentToEdit.users) {
              const existingAssignees = assignmentToEdit.users.map(user => ({
                user,
                position: (user as any).pivot?.position || 'Unknown'
              }))
              setAssignees(existingAssignees)
            }
          } else {
            // Reset form
            setEventName("")
            setEventLocation("")
            setDescription("")
            setStartDate("")
            setStartTime("")
            setEndDate("")
            setEndTime("")
            setAssignees([])
          }
        } catch (err) {
          console.error("Failed to fetch initial data", err)
        }
      }
      fetchInitialData()
    }
  }, [isOpen, assignmentToEdit])

  // Fetch availability when date changes
  useEffect(() => {
    if (startDate) {
      const fetchAvailability = async () => {
        try {
          const res = await availabilityAPI.getAvailability({ date: startDate, per_page: 100 })
          setAvailabilities(res.data)
        } catch (err) {
          console.error("Failed to fetch availability", err)
        }
      }
      fetchAvailability()
    }
  }, [startDate])

  // Auto-set end date when start date changes
  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate)
    }
  }, [startDate])

  const isStudentAvailable = (studentId: string) => {
    if (!startDate || !startTime || !endTime) return false

    // Convert form times to minutes for comparison
    const getMinutes = (time: string) => {
      const parts = time.split(':')
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }

    const startMinutes = getMinutes(startTime)
    const endMinutes = getMinutes(endTime)

    // Return true UNLESS we find a conflicting "class" or "unavailable" slot
    const hasConflict = availabilities.some(a => {
      if (a.student_id !== studentId) return false

      // We only care about blocking statuses
      if (a.status !== 'class' && a.status !== 'unavailable') return false

      const availStart = getMinutes(a.start_time)
      const availEnd = getMinutes(a.end_time)

      // Check if availability covers the assignment time
      // Simple overlap check: (StartA < EndB) and (EndA > StartB)
      return (availStart < endMinutes) && (availEnd > startMinutes)
    })

    return !hasConflict
  }

  const handleAddAssignee = () => {
    if (!selectedStudentId || !selectedPosition) return

    const student = students.find(s => s.id.toString() === selectedStudentId)
    if (student) {
      // Check if already added
      if (assignees.some(a => a.user.id === student.id)) {
        return // Already added
      }

      setAssignees(prev => [...prev, { user: student, position: selectedPosition }])
      setSelectedStudentId("")
      setSelectedPosition("")
    }
  }

  const handleRemoveAssignee = (userId: string) => {
    setAssignees(prev => prev.filter(a => a.user.id !== userId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Construct datetime strings
      const startTimeWithSeconds = startTime.length === 5 ? `${startTime}:00` : startTime
      const endTimeWithSeconds = endTime.length === 5 ? `${endTime}:00` : endTime

      const event_start_datetime = `${startDate}T${startTimeWithSeconds}`
      const event_end_datetime = `${endDate}T${endTimeWithSeconds}`

      const payload = {
        assignment_name: eventName,
        event_name: eventName,
        event_location: eventLocation,
        event_start_datetime,
        event_end_datetime,
        description,
        status: 'pending' as const
      }

      let assignmentId: number
      let currentUsers: User[] = []

      if (assignmentToEdit) {
        // Update existing assignment
        const { assignment } = await assignmentAPI.updateAssignment(assignmentToEdit.id, payload)
        assignmentId = assignment.id
        currentUsers = assignmentToEdit.users || []
      } else {
        // Create new assignment
        const { assignment } = await assignmentAPI.createAssignment(payload)
        assignmentId = assignment.id
      }

      // Handle Assignees with Diffing Logic
      const currentIds = new Set(currentUsers.map(u => u.id))
      const newIds = new Set(assignees.map(a => a.user.id))

      // Users to add
      const toAdd = assignees.filter(a => !currentIds.has(a.user.id))

      // Users to remove
      const toRemove = currentUsers.filter(u => !newIds.has(u.id))

      // Users to update (if position changed)
      const toUpdate = assignees.filter(a => {
        if (!currentIds.has(a.user.id)) return false
        const currentUser = currentUsers.find(u => u.id === a.user.id)
        const currentPosition = (currentUser as any).pivot?.position
        return (currentPosition || '') !== (a.position || '')
      })

      await Promise.all([
        ...toAdd.map(a => assignmentAPI.assignUser(assignmentId, a.user.id, { position: a.position })),
        ...toRemove.map(u => assignmentAPI.unassignUser(assignmentId, u.id)),
        ...toUpdate.map(a => assignmentAPI.updateUserPosition(assignmentId, a.user.id, a.position))
      ])

      onAssignmentCreated()
      onClose()

      // Reset form
      setEventName("")
      setEventLocation("")
      setDescription("")
      setStartDate("")
      setStartTime("")
      setEndDate("")
      setEndTime("")
      setAssignees([])
    } catch (err) {
      setError(formatAPIError(err))
      // Scroll to top to show error
      setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  // Group students by availability
  const availableStudents = students.filter(s => isStudentAvailable(s.id))
  const unavailableStudents = students.filter(s => !isStudentAvailable(s.id))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-card/95 backdrop-blur-xl border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div ref={topRef} className="absolute top-0 left-0 w-full h-0" />
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{assignmentToEdit ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
          <DialogDescription>
            {assignmentToEdit ? "Update the details of the assignment." : "Fill in the details below to create a new assignment and assign students."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="whitespace-pre-wrap">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="event_name" className="flex items-center gap-2 text-foreground font-semibold">
              <Calendar className="w-4 h-4" />
              Event / Assignment Name
            </Label>
            <Input
              id="event_name"
              placeholder="e.g. Graduation Ceremony - Camera A"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              className="bg-muted/50 border-input focus:border-primary focus:ring-primary/20 text-foreground font-medium placeholder:text-muted-foreground"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event_location" className="flex items-center gap-2 text-foreground font-semibold">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="event_location"
              placeholder="e.g. Main Auditorium"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              required
              className="bg-muted/50 border-input focus:border-primary focus:ring-primary/20 text-foreground font-medium placeholder:text-muted-foreground"
            />
          </div>

          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-foreground font-semibold">
                <Clock className="w-4 h-4" />
                Start
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-muted/50 border-input focus:border-primary focus:ring-primary/20 text-foreground"
                />
                <div className="relative">
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  >
                    <option value="" disabled>Select time</option>
                    {timeSlots.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-foreground font-semibold">
                <Clock className="w-4 h-4" />
                End
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="bg-muted/50 border-input focus:border-primary focus:ring-primary/20 text-foreground"
                />
                <div className="relative">
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  >
                    <option value="" disabled>Select time</option>
                    {timeSlots.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Add any additional details, requirements, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-muted/50 border-input focus:border-primary focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Assignees Section */}
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-foreground font-bold text-lg">
                <UserPlus className="w-5 h-5" />
                Assign Students
              </Label>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                >
                  <span className={!selectedStudentId ? "text-muted-foreground" : "font-medium"}>
                    {selectedStudentId
                      ? students.find(s => s.id.toString() === selectedStudentId)?.name
                      : "Select Student..."}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>

                {isStudentDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsStudentDropdownOpen(false)}
                    />
                    <div
                      className={`absolute z-20 w-full overflow-auto rounded-md border border-border bg-card/90 backdrop-blur-xl py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm max-h-60 ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'
                        }`}
                    >
                      {availableStudents.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Available</div>
                          {availableStudents.map(student => (
                            <div
                              key={student.id}
                              className="relative cursor-pointer select-none py-2 pl-3 pr-4 hover:bg-primary/10 text-foreground flex justify-between items-center group"
                              onClick={() => {
                                setSelectedStudentId(student.id.toString())
                                setIsStudentDropdownOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-600 dark:text-green-400 dark:group-hover:text-white">{student.name}</span>
                                {selectedStudentId === student.id.toString() && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full border border-border">
                                {student.remaining_hours_this_week ? `${student.remaining_hours_this_week}h left` : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {unavailableStudents.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-t border-border">Others</div>
                          {unavailableStudents.map(student => (
                            <div
                              key={student.id}
                              className="relative cursor-pointer select-none py-2 pl-3 pr-4 hover:bg-muted text-foreground flex justify-between items-center"
                              onClick={() => {
                                setSelectedStudentId(student.id.toString())
                                setIsStudentDropdownOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{student.name}</span>
                                {selectedStudentId === student.id.toString() && (
                                  <Check className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {student.remaining_hours_this_week ? `${student.remaining_hours_this_week}h left` : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {students.length === 0 && (
                        <div className="py-2 px-3 text-sm text-muted-foreground text-center">No students found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="w-1/3">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                >
                  <option value="">Select Position...</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={handleAddAssignee}
                disabled={!selectedStudentId || !selectedPosition}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Assignees List */}
            {assignees.length > 0 && (
              <div className="space-y-2 bg-muted/50 p-3 rounded-lg border border-border">
                {assignees.map((assignee) => (
                  <div key={assignee.user.id} className="flex items-center justify-between bg-card p-2 rounded shadow-sm border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {assignee.user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{assignee.user.name}</p>
                        <p className="text-xs text-muted-foreground">{assignee.position}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignee(assignee.user.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? (assignmentToEdit ? "Updating..." : "Creating...") : (assignmentToEdit ? "Update Assignment" : "Create Assignment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
