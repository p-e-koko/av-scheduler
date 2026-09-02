"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Plus, RefreshCw, Calendar, Trash2, Loader2 } from "lucide-react"
import { api, formatAPIError } from "@/lib/api"

interface MarketingSupervisorSchedule {
    id: number
    user_id: number
    title: string
    start_datetime: string
    end_datetime: string
    supervisor?: { id: number, name: string }
}

interface MarketingSupervisorSchedulePageProps {
    canUpload?: boolean // Used to denote actual supervisor who can add time
}

// Dummy base dates for 2024-01-01 (Monday) to 2024-01-05 (Friday)
const DUMMY_DATES: Record<string, string> = {
    'Monday': '2024-01-01',
    'Tuesday': '2024-01-02',
    'Wednesday': '2024-01-03',
    'Thursday': '2024-01-04',
    'Friday': '2024-01-05'
}

export function MarketingSupervisorSchedulePage({ canUpload = false }: MarketingSupervisorSchedulePageProps) {
    const [schedules, setSchedules] = useState<MarketingSupervisorSchedule[]>([])
    const [loading, setLoading] = useState(true)

    const [showAddModal, setShowAddModal] = useState(false)

    // Single add form
    const [title, setTitle] = useState("")
    const [dayOfWeek, setDayOfWeek] = useState("Monday")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSchedules = async () => {
        setLoading(true)
        try {
            const res: any = await api.get('/marketing-supervisor-schedules')
            setSchedules(res.data.data || res.data || [])
        } catch {
            setSchedules([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSchedules()
    }, [])

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            const baseDate = DUMMY_DATES[dayOfWeek]
            if (!baseDate) throw new Error("Invalid day selected")

            const start = `${baseDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`
            const end = `${baseDate}T${endTime.length === 5 ? endTime + ':00' : endTime}`

            await api.post("/marketing-supervisor-schedules", {
                title,
                start_datetime: start,
                end_datetime: end
            })
            setShowAddModal(false)
            setTitle("")
            setDayOfWeek("Monday")
            setStartTime("")
            setEndTime("")
            fetchSchedules()
        } catch (err: any) {
            setError(formatAPIError(err))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this schedule slot?")) return
        try {
            await api.delete(`/marketing-supervisor-schedules/${id}`)
            fetchSchedules()
        } catch (err) {
            alert("Failed to delete slot.")
        }
    }

    // Time slots for select menus (restricted to business hours 08:00 - 17:00 as requested, though options cover a bit more just in case)
    const timeSlots: string[] = []
    for (let i = 8; i <= 17; i++) {
        const h = i.toString().padStart(2, '0')
        timeSlots.push(`${h}:00`)
        if (i < 17) timeSlots.push(`${h}:30`)
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    // Group current user's schedules by day (we can assume all returned are either the user's or all supervisors, but the design asked for standard list)
    const getSchedulesForDay = (dayName: string) => {
        const slots: Array<any> = []
        schedules.forEach(slot => {
            const start = new Date(slot.start_datetime)
            const end = new Date(slot.end_datetime)
            const dayIndex = daysOfWeek.indexOf(dayName) + 1
            if (start.getDay() === dayIndex) {
                slots.push({
                    id: slot.id,
                    title: slot.title,
                    user: slot.supervisor?.name || 'Supervisor',
                    startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                    endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                    startObj: start
                })
            }
        })
        return slots.sort((a, b) => a.startObj.getTime() - b.startObj.getTime())
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-marketing-600" />
                    My Recurring Schedule
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSchedules} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    {canUpload && (
                        <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-marketing-600 hover:bg-marketing-700 text-white">
                            <Plus className="w-4 h-4 mr-1" /> Add Time
                        </Button>
                    )}
                </div>
            </div>

            <Card className="bg-card/80 backdrop-blur-xl border-border shadow-md h-fit">
                <CardHeader className="bg-muted/50 border-b border-border py-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        Weekly Availability (Mon-Fri)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-marketing-600" />
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {daysOfWeek.map((day) => {
                                const daySlots = getSchedulesForDay(day)
                                return (
                                    <div key={day} className="p-4 hover:bg-muted/30 transition-colors">
                                        <div className="font-semibold text-lg flex items-center gap-2 text-marketing-700 mb-3 border-b border-marketing-200/50 pb-2">
                                            <Calendar className="h-4 w-4" />
                                            {day}
                                        </div>

                                        {daySlots.length > 0 ? (
                                            <div className="space-y-3 pl-6">
                                                {daySlots.map((slot: any) => (
                                                    <div key={slot.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-marketing-100 text-marketing-800 px-3 py-1 rounded-full text-sm font-semibold inline-block shadow-sm">
                                                                {slot.startTime} - {slot.endTime}
                                                            </div>
                                                            <div className="text-sm font-medium text-foreground">
                                                                {slot.title}
                                                            </div>
                                                        </div>
                                                        {canUpload && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleDelete(slot.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground text-sm pl-6 italic opacity-70">
                                                No availability scheduled
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Single Time Block Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Entry to Weekly Schedule</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
                        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}

                        <div className="space-y-2">
                            <Label>Day of the Week</Label>
                            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full h-10 rounded-md border border-input px-3" required>
                                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Title / Note</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Office Hours" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-10 rounded-md border border-input px-3" required>
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-10 rounded-md border border-input px-3" required>
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="bg-marketing-600 hover:bg-marketing-700 text-white">
                                {saving ? "Saving..." : "Add"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
