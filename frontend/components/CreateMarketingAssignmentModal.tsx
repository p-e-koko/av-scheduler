"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import {
    Calendar, MapPin, FileText, Clock, Type, Plus, Trash2, UserPlus,
    AlertCircle, ChevronDown, Check, Search, Package
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import {
    api, assignmentAPI, userAPI,
    formatAPIError, type User, type Assignment
} from "@/lib/api"

interface CreateMarketingAssignmentModalProps {
    isOpen: boolean
    onClose: () => void
    onAssignmentCreated: () => void
    assignmentToEdit?: Assignment | null
}

export function CreateMarketingAssignmentModal({ isOpen, onClose, onAssignmentCreated, assignmentToEdit }: CreateMarketingAssignmentModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [eventName, setEventName] = useState("")
    const [eventLocation, setEventLocation] = useState("")
    const [description, setDescription] = useState("")
    const [startDate, setStartDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endDate, setEndDate] = useState("")
    const [endTime, setEndTime] = useState("")

    // Assignee / Equipment State
    const [assignees, setAssignees] = useState<User[]>([])
    const [selectedEquipment, setSelectedEquipment] = useState<any[]>([])

    // Data lists
    const [students, setStudents] = useState<User[]>([])
    const [equipmentList, setEquipmentList] = useState<any[]>([])

    // Dropdown states
    const [selectedStudentId, setSelectedStudentId] = useState<string>("")
    const [selectedEqId, setSelectedEqId] = useState<string>("")

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
                    const [studentsRes, eqRes]: any[] = await Promise.all([
                        userAPI.getUsers({ role: 'student_ambassador', per_page: 100 }),
                        api.get('/marketing-equipment')
                    ])
                    setStudents(studentsRes.data || studentsRes)
                    setEquipmentList(eqRes.data.data || eqRes.data || [])

                    if (assignmentToEdit) {
                        setEventName(assignmentToEdit.event_name)
                        setEventLocation(assignmentToEdit.event_location)
                        setDescription(assignmentToEdit.description || "")

                        const start = new Date(assignmentToEdit.event_start_datetime)
                        const end = new Date(assignmentToEdit.event_end_datetime)
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

                        setAssignees(assignmentToEdit.users as User[] || [])

                        // fetch existing equipment
                        const eqAssigned: any = await api.get(`/assignments/${assignmentToEdit.id}/marketing-equipment`)
                        setSelectedEquipment(eqAssigned.data.data || eqAssigned.data || [])
                    } else {
                        resetForm()
                    }
                } catch (err) {
                    console.error("Failed to fetch initial data", err)
                }
            }
            fetchInitialData()
        }
    }, [isOpen, assignmentToEdit])

    // Auto-set end date when start date changes
    useEffect(() => {
        if (startDate && !endDate) setEndDate(startDate)
    }, [startDate])

    const resetForm = () => {
        setEventName(""); setEventLocation(""); setDescription("")
        setStartDate(""); setStartTime(""); setEndDate(""); setEndTime("")
        setAssignees([]); setSelectedEquipment([])
    }

    const handleAddAssignee = () => {
        if (!selectedStudentId) return
        const student = students.find(s => s.id.toString() === selectedStudentId)
        if (student && !assignees.find(a => a.id === student.id)) {
            setAssignees(prev => [...prev, student])
        }
        setSelectedStudentId("")
    }

    const handleRemoveAssignee = (userId: string | number) => {
        setAssignees(prev => prev.filter(a => a.id !== userId))
    }

    const handleAddEquipment = () => {
        if (!selectedEqId) return
        const item = equipmentList.find(e => e.id.toString() === selectedEqId)
        if (item && !selectedEquipment.find(e => e.id === item.id)) {
            setSelectedEquipment(prev => [...prev, item])
        }
        setSelectedEqId("")
    }

    const handleRemoveEquipment = (id: number) => {
        setSelectedEquipment(prev => prev.filter(e => e.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const startTimeWithSeconds = startTime.length === 5 ? `${startTime}:00` : startTime
            const endTimeWithSeconds = endTime.length === 5 ? `${endTime}:00` : endTime
            const event_start_datetime = `${startDate}T${startTimeWithSeconds}`
            const event_end_datetime = `${endDate}T${endTimeWithSeconds}`

            const payload: Record<string, string> = {
                assignment_name: eventName,
                event_name: eventName,
                event_location: eventLocation,
                event_start_datetime,
                event_end_datetime,
                description,
            }
            if (!assignmentToEdit) { payload.status = 'pending' }

            let assignmentId: number
            let currentUsers: User[] = []
            let currentEq: any[] = []

            // 1. Check for equipment conflict before creating/updating
            if (selectedEquipment.length > 0) {
                try {
                    await api.post(`/marketing-equipment/check-conflict`, {
                        equipment_ids: selectedEquipment.map(e => e.id),
                        start_datetime: event_start_datetime,
                        end_datetime: event_end_datetime,
                        exclude_assignment_id: assignmentToEdit?.id
                    })
                } catch (conflictErr: any) {
                    throw new Error(conflictErr.response?.data?.message || 'Equipment conflict detected.')
                }
            }

            // 2. Save Assignment
            if (assignmentToEdit) {
                const { assignment } = await assignmentAPI.updateAssignment(assignmentToEdit.id, payload)
                assignmentId = assignment.id
                currentUsers = assignmentToEdit.users || []
                const currEqRes: any = await api.get(`/assignments/${assignmentId}/marketing-equipment`)
                currentEq = currEqRes.data.data || currEqRes.data || []
            } else {
                const { assignment } = await assignmentAPI.createAssignment(payload)
                assignmentId = assignment.id
            }

            // 3. Handle Assignees
            const currentIds = new Set(currentUsers.map(u => u.id))
            const newIds = new Set(assignees.map(a => a.id))
            const toAddUsers = assignees.filter(a => !currentIds.has(a.id))
            const toRemoveUsers = currentUsers.filter(u => !newIds.has(u.id))

            await Promise.all([
                ...toAddUsers.map(a => assignmentAPI.assignUser(assignmentId, String(a.id), { position: null as any })),
                ...toRemoveUsers.map(u => assignmentAPI.unassignUser(assignmentId, String(u.id))),
            ])

            // 4. Handle Equipment
            const currentEqIds = new Set(currentEq.map(e => e.id))
            const newEqIds = new Set(selectedEquipment.map(e => e.id))
            const toAddEq = selectedEquipment.filter(e => !currentEqIds.has(e.id))
            const toRemoveEq = currentEq.filter(e => !newEqIds.has(e.id))

            await Promise.all([
                ...toAddEq.map(e => api.post(`/assignments/${assignmentId}/marketing-equipment/assign`, { marketing_equipment_id: e.id, quantity_used: 1 })),
                ...toRemoveEq.map(e => api.delete(`/assignments/${assignmentId}/marketing-equipment/${e.id}`))
            ])

            onAssignmentCreated()
            onClose()
            resetForm()
        } catch (err: any) {
            setError(err.message || formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-card/95 backdrop-blur-xl border-border shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">{assignmentToEdit ? "Edit Marketing Assignment" : "Create Marketing Assignment"}</DialogTitle>
                    <DialogDescription>
                        {assignmentToEdit ? "Update details." : "Create assignment, select equipment, and assign ambassadors."}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/20 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="whitespace-pre-wrap">{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="event_name" className="flex items-center gap-2 font-semibold"><Calendar className="w-4 h-4" />Event Name</Label>
                            <Input id="event_name" required value={eventName} onChange={(e) => setEventName(e.target.value)} className="bg-muted/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="event_location" className="flex items-center gap-2 font-semibold"><MapPin className="w-4 h-4" />Location</Label>
                            <Input id="event_location" required value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="bg-muted/50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 font-semibold"><Clock className="w-4 h-4" />Start</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-muted/50" />
                                <select required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 font-semibold"><Clock className="w-4 h-4" />End</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-muted/50" />
                                <select required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="" disabled>Time</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4" />Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/50 min-h-[80px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-t border-border pt-4 mt-2">
                        {/* Equipment Selection */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 font-bold"><Package className="w-4 h-4 text-pink-500" />Equipment</Label>
                            <div className="flex gap-2">
                                <select value={selectedEqId} onChange={e => setSelectedEqId(e.target.value)} className="flex-1 rounded-md border border-input bg-muted/50 px-3 text-sm h-9">
                                    <option value="">Select Equipment...</option>
                                    {equipmentList.filter(e => !selectedEquipment.find(se => se.id === e.id)).map(e => (
                                        <option key={e.id} value={e.id}>{e.name} (Qty: {e.quantity})</option>
                                    ))}
                                </select>
                                <Button type="button" onClick={handleAddEquipment} disabled={!selectedEqId} size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">Add</Button>
                            </div>
                            <div className="space-y-2">
                                {selectedEquipment.map(eq => (
                                    <div key={eq.id} className="text-sm bg-muted/40 border border-border p-2 rounded flex justify-between items-center">
                                        <span>{eq.name}</span>
                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemoveEquipment(eq.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ambassadors Selection */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 font-bold"><UserPlus className="w-4 h-4 text-pink-500" />Ambassadors</Label>
                            <div className="flex gap-2">
                                <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="flex-1 rounded-md border border-input bg-muted/50 px-3 text-sm h-9">
                                    <option value="">Select Ambassador...</option>
                                    {students.filter(s => !assignees.find(a => a.id === s.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <Button type="button" onClick={handleAddAssignee} disabled={!selectedStudentId} size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">Add</Button>
                            </div>
                            <div className="space-y-2">
                                {assignees.map(user => (
                                    <div key={user.id} className="text-sm bg-muted/40 border border-border p-2 rounded flex justify-between items-center">
                                        <span>{user.name}</span>
                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemoveAssignee(user.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white">
                            {loading ? "Saving..." : (assignmentToEdit ? "Update Assignment" : "Create Assignment")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
