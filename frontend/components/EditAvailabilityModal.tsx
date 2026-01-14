"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { availabilityAPI, type Availability } from "@/lib/api"
import { Trash2 } from "lucide-react"
import ConfirmationDialog from "@/components/ConfirmationDialog"

interface EditAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  availability: Availability | null
  existingAvailability?: Availability[]
}

export function EditAvailabilityModal({ isOpen, onClose, onSuccess, availability, existingAvailability }: EditAvailabilityModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    status: "available" as "available" | "unavailable" | "class"
  })

  useEffect(() => {
    if (availability) {
      setFormData({
        date: availability.date.split('T')[0],
        start_time: availability.start_time.substring(0, 5), // HH:MM
        end_time: availability.end_time.substring(0, 5), // HH:MM
        status: availability.status
      })
    }
  }, [availability])

  // Generate time slots
  const timeSlots = []
  for (let i = 0; i <= 23; i++) {
    const hour = i.toString().padStart(2, '0')
    timeSlots.push(`${hour}:00`)
    timeSlots.push(`${hour}:30`)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!availability) return

    setLoading(true)
    setError(null)

    try {
      // Ensure seconds are added for backend validation (H:i:s)
      const startTimeWithSeconds = formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time
      const endTimeWithSeconds = formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time

      if (endTimeWithSeconds <= startTimeWithSeconds) {
        throw new Error("End time must be after start time")
      }

      // Check for overlaps
      if (existingAvailability) {
        const hasOverlap = existingAvailability.some(existing => {
          // Exclude self
          if (existing.id === availability.id) return false

          const existingDate = existing.date.split('T')[0]
          if (existingDate !== formData.date) return false

          return startTimeWithSeconds < existing.end_time && endTimeWithSeconds > existing.start_time
        })

        if (hasOverlap) {
          throw new Error("This time slot overlaps with another existing availability.")
        }
      }

      await availabilityAPI.updateAvailability(availability.id, {
        date: formData.date,
        start_time: startTimeWithSeconds,
        end_time: endTimeWithSeconds,
        status: formData.status,
        student_id: availability.student_id
      }, true) // isMyAvailability = true

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update availability")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!availability) return

    setLoading(true)
    setError(null)

    try {
      await availabilityAPI.deleteAvailability(availability.id, true) // isMyAvailability = true
      onSuccess()
      onClose()
      setIsDeleteDialogOpen(false)
    } catch (err: any) {
      setError(err.message || "Failed to delete availability")
      setLoading(false)
    }
  }

  if (!availability) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
            <DialogDescription>
              Update or delete your availability.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="text-destructive text-sm">{error}</div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full cursor-pointer bg-background text-foreground border-input placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-start_time" className="text-right">
                  Start Time
                </Label>
                <div className="col-span-3 relative">
                  <select
                    id="edit-start_time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    required
                  >
                    <option value="" disabled>Select start time</option>
                    {timeSlots.map((time) => (
                      <option key={`edit-start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-end_time" className="text-right">
                  End Time
                </Label>
                <div className="col-span-3 relative">
                  <select
                    id="edit-end_time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    required
                  >
                    <option value="" disabled>Select end time</option>
                    {timeSlots.map((time) => (
                      <option key={`edit-end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3 relative">
                  <select
                    id="edit-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  >
                    <option value="available">Available</option>
                    <option value="class">Class</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
               <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="text-foreground" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Availability"
        description="Are you sure you want to delete this availability slot? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  )
}
