"use client"

import { useState, useEffect, useRef } from "react"
import { CalendarComponent, CalendarEvent } from "@/components/CalendarComponent"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Plus, RefreshCw, Trash2, Upload } from "lucide-react"
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
    canUpload?: boolean // Only true for marketing_supervisor
}

export function MarketingSupervisorSchedulePage({ canUpload = false }: MarketingSupervisorSchedulePageProps) {
    const [schedules, setSchedules] = useState<MarketingSupervisorSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<"month" | "week" | "day">("week")

    // Modals state
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)

    // File upload state for CSV/iCal mapping
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Single add form
    const [title, setTitle] = useState("")
    const [startDate, setStartDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endDate, setEndDate] = useState("")
    const [endTime, setEndTime] = useState("")
    const [saving, setSaving] = useState(false)

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

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return
        setUploading(true)
        setError(null)
        const formData = new FormData()
        formData.append("file", file)
        try {
            await api.post("/marketing-supervisor-schedules/upload", formData)
            setShowUploadModal(false)
            setFile(null)
            fetchSchedules()
        } catch (err: any) {
            setError(formatAPIError(err))
        } finally {
            setUploading(false)
        }
    }

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        try {
            const start = `${startDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`
            const end = `${endDate}T${endTime.length === 5 ? endTime + ':00' : endTime}`

            await api.post("/marketing-supervisor-schedules", {
                title,
                start_datetime: start,
                end_datetime: end
            })
            setShowAddModal(false)
            setTitle("")
            setStartDate("")
            setStartTime("")
            setEndDate("")
            setEndTime("")
            fetchSchedules()
        } catch (err: any) {
            setError(formatAPIError(err))
        } finally {
            setSaving(false)
        }
    }

    // Convert to Calendar events
    const events: CalendarEvent[] = schedules.map(s => {
        const supervisorName = s.supervisor?.name ? ` (${s.supervisor.name})` : ''
        return {
            id: s.id.toString(),
            title: `${s.title}${supervisorName}`,
            start: new Date(s.start_datetime),
            end: new Date(s.end_datetime),
            color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/30 dark:border-fuchsia-700 dark:text-fuchsia-300",
        }
    })

    // Time slots for select menus
    const timeSlots: string[] = []
    for (let i = 0; i <= 23; i++) {
        const h = i.toString().padStart(2, '0')
        timeSlots.push(`${h}:00`)
        timeSlots.push(`${h}:30`)
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-rose-500" />
                    Supervisor Schedule
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSchedules} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    {canUpload && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)} className="text-rose-600 hover:text-rose-700">
                                <Upload className="w-4 h-4 mr-1" /> Upload CSV
                            </Button>
                            <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                <Plus className="w-4 h-4 mr-1" /> Add Time
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden min-h-[600px] shadow-sm relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="flex items-center text-muted-foreground gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin" /> Loading Schedule...
                        </div>
                    </div>
                ) : null}
                <div className="h-full [&_.bg-fuchsia-100]:border-l-4">
                    <CalendarComponent
                        events={events}
                        view={view}
                        onViewChange={(v: "month" | "week" | "day") => setView(v)}
                    />
                </div>
            </div>

            {/* Upload CSV Modal */}
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Schedule (CSV/iCal)</DialogTitle>
                        <DialogDescription>Bulk import office hours and appointments</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
                        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
                        <div className="space-y-2">
                            <Label>File</Label>
                            <Input type="file" accept=".csv,.ics" onChange={e => setFile(e.target.files?.[0] || null)} required />
                            <p className="text-xs text-muted-foreground">Format: CSV with columns (title, start_datetime, end_datetime)</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploading || !file} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Single Time Block Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Entry to Schedule</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
                        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Office Hours" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start</Label>
                                <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} required />
                                <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-10 rounded-md border border-input px-3" required>
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>End</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                                <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-10 rounded-md border border-input px-3" required>
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {saving ? "Saving..." : "Add"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
