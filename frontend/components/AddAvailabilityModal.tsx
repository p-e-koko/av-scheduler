"use client"

import { useState } from "react"
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
// import { v4 as uuidv4 } from 'uuid'; // Removed as we use custom function

// Simple UUID generator fallback
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface AddAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingAvailability?: Availability[]
}

export function AddAvailabilityModal({ isOpen, onClose, onSuccess, existingAvailability }: AddAvailabilityModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    status: "class" as "available" | "unavailable" | "class",
    title: ""
  })
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "weekly" | "weekday">("none")
  const [endsOn, setEndsOn] = useState("")

  // Generate time slots
  const timeSlots = []
  for (let i = 0; i <= 23; i++) {
    const hour = i.toString().padStart(2, '0')
    timeSlots.push(`${hour}:00`)
    timeSlots.push(`${hour}:30`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Ensure seconds are added for backend validation (H:i:s)
      const startTimeWithSeconds = formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time
      const endTimeWithSeconds = formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time

      if (endTimeWithSeconds <= startTimeWithSeconds) {
        throw new Error("End time must be after start time")
      }

      const availabilities = []

      if (repeatType === "none") {
        availabilities.push({
          date: formData.date,
          start_time: startTimeWithSeconds,
          end_time: endTimeWithSeconds,
          status: formData.status,
          title: formData.title || undefined
        })
      } else {
        if (!endsOn) throw new Error("Please select an end date for the recurring availability.")

        const startDate = new Date(formData.date)
        const endDate = new Date(endsOn)

        if (endDate < startDate) throw new Error("End date must be after start date.")

        const currentDate = new Date(startDate)
        const recurrenceId = generateUUID()

        while (currentDate <= endDate) {
          let shouldAdd = true

          if (repeatType === "weekday") {
            const day = currentDate.getDay()
            if (day === 0 || day === 6) shouldAdd = false // 0 is Sunday, 6 is Saturday
          }

          if (shouldAdd) {
            availabilities.push({
              date: currentDate.toISOString().split('T')[0],
              start_time: startTimeWithSeconds,
              end_time: endTimeWithSeconds,
              status: formData.status,
              title: formData.title || undefined,
              recurrence_id: recurrenceId
            })
          }

          // Increment date
          if (repeatType === "weekly") {
            currentDate.setDate(currentDate.getDate() + 7)
          } else {
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }
      }

      if (availabilities.length === 0) {
        throw new Error("No valid dates generated with the selected options.")
      }

      // Check for overlaps
      if (existingAvailability) {
        for (const newSlot of availabilities) {
          const newStart = newSlot.start_time
          const newEnd = newSlot.end_time

          const hasOverlap = existingAvailability.some(existing => {
            // Ignore existing "available" slots as they are now effectively deleted/ignored
            if (existing.status === 'available') return false

            // Only check same date
            // backend format might be YYYY-MM-DD or with time. Assume YYYY-MM-DD for date part comparison.
            const existingDate = existing.date.split('T')[0]
            if (existingDate !== newSlot.date) return false

            // Compare times
            // Ensure we are comparing comparable strings (both HH:MM:SS or HH:MM)
            // API usually returns HH:MM:SS. We handle inputs by ensuring HH:MM:00

            // Simple string comparison works for ISO formatted times
            return newStart < existing.end_time && newEnd > existing.start_time
          })

          if (hasOverlap) {
            throw new Error(`Time slot ${newSlot.start_time} - ${newSlot.end_time} on ${newSlot.date} overlaps with an existing availability.`)
          }
        }
      }

      // Use bulkCreateAvailability with isMyAvailability = true
      await availabilityAPI.bulkCreateAvailability(availabilities, true)

      onSuccess()
      onClose()
      // Reset form
      setFormData({
        date: "",
        start_time: "",
        end_time: "",
        status: "class",
        title: ""
      })
      setRepeatType("none")
      setEndsOn("")
    } catch (err: any) {
      setError(err.message || "Failed to add availability")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add Availability</DialogTitle>
          <DialogDescription>
            Set your availability for a specific date and time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Event Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-background text-foreground border-input placeholder:text-muted-foreground"
                  placeholder="Required"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full cursor-pointer bg-background text-foreground border-input placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repeat" className="text-right">
                Repeat
              </Label>
              <div className="col-span-3 relative">
                <select
                  id="repeat"
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as any)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekday">Every weekday (Monday to Friday)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {repeatType !== "none" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endsOn" className="text-right">
                  Ends On
                </Label>
                <div className="col-span-3">
                  <Input
                    id="endsOn"
                    type="date"
                    value={endsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                    className="w-full cursor-pointer bg-background text-foreground border-input placeholder:text-muted-foreground"
                    required={true}
                    min={formData.date}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_time" className="text-right">
                Start Time
              </Label>
              <div className="col-span-3 relative">
                <select
                  id="start_time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  required
                >
                  <option value="" disabled>Select start time</option>
                  {timeSlots.map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_time" className="text-right">
                End Time
              </Label>
              <div className="col-span-3 relative">
                <select
                  id="end_time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  required
                >
                  <option value="" disabled>Select end time</option>
                  {timeSlots.map((time) => (
                    <option key={`end-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3 relative">
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                >
                  <option value="class">Class</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-foreground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
