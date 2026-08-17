"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Search, X, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { StatusDialog } from "@/components/StatusDialog"
import { LoadingDialog } from "@/components/LoadingDialog"
import {
    itOfficeScheduleAPI,
    getStoredUser,
    availabilityAPI,
    type User,
    type ITOfficeSchedule,
    type Availability,
} from "@/lib/api"
import { getITAssistantColor } from "@/lib/it-assistant-colors"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 8am–6pm (last slot is 6pm–7pm)

const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

const formatHour = (h: number) => {
    if (h === 12) return "12pm"
    if (h > 12) return `${h - 12}pm`
    return `${h}am`
}

function isBlocked(availability: Availability[], studentId: string, dayOfWeek: number, hour: number): boolean {
    return availability.some((a) => {
        if (a.student_id !== studentId) return false
        if (a.status !== "class" && a.status !== "unavailable") return false

        // Safely parse "YYYY-MM-DD" local time to avoid timezone bleeding over to adjacent days
        const parts = a.date.split("-")
        if (parts.length !== 3) return false
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))

        const avDow = date.getDay()
        if (avDow !== dayOfWeek) return false

        const [startH] = a.start_time.split(":").map(Number)
        const [endH] = a.end_time.split(":").map(Number)

        return hour >= startH && hour < endH
    })
}

export function ITOfficeSchedulePage() {
    const [assistants, setAssistants] = useState<User[]>([])
    const [schedules, setSchedules] = useState<ITOfficeSchedule[]>([])
    const [availability, setAvailability] = useState<Availability[]>([])
    const [loading, setLoading] = useState(true)

    // Drag state
    const [draggingAssistant, setDraggingAssistant] = useState<User | null>(null)
    const [dragOver, setDragOver] = useState<{ day: number; hour: number } | null>(null)

    // Popover state (click to assign)
    const [popoverCell, setPopoverCell] = useState<{ day: number; hour: number } | null>(null)
    const [popoverSearch, setPopoverSearch] = useState("")
    const [popoverAssistants, setPopoverAssistants] = useState<User[]>([])
    const [popoverLoading, setPopoverLoading] = useState(false)

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<ITOfficeSchedule | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Status / loading dialogs
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusDialog, setStatusDialog] = useState<{
        isOpen: boolean; title: string; description: string; type: "success" | "error"
    }>({ isOpen: false, title: "", description: "", type: "success" })

    const currentUser = getStoredUser()

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true)
            const [assistantsRes, schedulesRes] = await Promise.all([
                itOfficeScheduleAPI.getITAssistants(),
                itOfficeScheduleAPI.getSchedules(),
            ])
            setAssistants(assistantsRes.data)
            setSchedules(schedulesRes.data)

            // Fetch availability for all IT assistants
            if (assistantsRes.data.length > 0) {
                const ids = assistantsRes.data.map(a => a.id)
                // Fetch per-student availability (limit to current week to prevent old semester false-blocks)
                const now = new Date()
                const currentDay = now.getDay()
                const startOfWeek = new Date(now)
                startOfWeek.setDate(now.getDate() - currentDay)
                const endOfWeek = new Date(startOfWeek)
                endOfWeek.setDate(startOfWeek.getDate() + 6)

                const formatDate = (date: Date) => {
                    const y = date.getFullYear()
                    const m = String(date.getMonth() + 1).padStart(2, '0')
                    const dd = String(date.getDate()).padStart(2, '0')
                    return `${y}-${m}-${dd}`
                }

                const availRes = await availabilityAPI.getAvailability({
                    per_page: 10000,
                    date_from: formatDate(startOfWeek),
                    date_to: formatDate(endOfWeek)
                })
                setAvailability(availRes.data.filter(a => ids.includes(a.student_id)))
            }
        } catch (err) {
            console.error("Failed to load IT Office Schedule data", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    // Get schedule entries for a cell
    const getScheduleEntries = (day: number, hour: number): ITOfficeSchedule[] => {
        return schedules.filter(
            (s) =>
                s.day_of_week === day &&
                parseInt(s.start_time.split(":")[0]) === hour
        )
    }

    // Drag handlers
    const handleDragStart = (assistant: User) => {
        setDraggingAssistant(assistant)
    }

    const handleDragOver = (e: React.DragEvent, day: number, hour: number) => {
        e.preventDefault()
        setDragOver({ day, hour })
    }

    const handleDrop = async (e: React.DragEvent, day: number, hour: number) => {
        e.preventDefault()
        if (!draggingAssistant) return
        setDragOver(null)
        setDraggingAssistant(null)

        // Check if student is blocked
        if (isBlocked(availability, draggingAssistant.id, day, hour)) {
            setStatusDialog({
                isOpen: true,
                title: "Cannot Assign",
                description: `${draggingAssistant.name} has a class or unavailability at this time slot.`,
                type: "error",
            })
            return
        }

        // Check if student already in this slot
        const entries = getScheduleEntries(day, hour)
        if (entries.some(e => e.student_id === draggingAssistant.id)) {
            setStatusDialog({
                isOpen: true,
                title: "Already Assigned",
                description: `${draggingAssistant.name} is already assigned to this slot.`,
                type: "error",
            })
            return
        }

        await assignAssistant(draggingAssistant, day, hour)
    }

    const assignAssistant = async (assistant: User, day: number, hour: number) => {
        try {
            setIsProcessing(true)
            const padded = (n: number) => String(n).padStart(2, "0")
            await itOfficeScheduleAPI.createSchedule({
                student_id: assistant.id,
                day_of_week: day,
                start_time: `${padded(hour)}:00`,
                end_time: `${padded(hour + 1)}:00`,
            })
            await fetchAll()
            setStatusDialog({
                isOpen: true,
                title: "Assigned",
                description: `${assistant.name} assigned to ${DAYS[day]} ${formatHour(hour)}–${formatHour(hour + 1)}.`,
                type: "success",
            })
        } catch (err: any) {
            setStatusDialog({ isOpen: true, title: "Error", description: err.message || "Failed to assign.", type: "error" })
        } finally {
            setIsProcessing(false)
            setPopoverCell(null)
        }
    }

    // Popover open
    const openPopover = (day: number, hour: number) => {
        setPopoverCell({ day, hour })
        setPopoverSearch("")

        const entries = getScheduleEntries(day, hour)
        const assignedIds = entries.map(e => e.student_id)

        const availableAndUnassigned = assistants.filter(a => {
            const blocked = isBlocked(availability, a.id, day, hour)
            if (blocked) return false
            return !assignedIds.includes(a.id)
        })

        setPopoverAssistants(availableAndUnassigned)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        try {
            setIsProcessing(true)
            await itOfficeScheduleAPI.deleteSchedule(deleteTarget.id)
            await fetchAll()
            setStatusDialog({ isOpen: true, title: "Deleted", description: "Schedule slot removed.", type: "success" })
        } catch (err: any) {
            setStatusDialog({ isOpen: true, title: "Error", description: err.message || "Failed to delete.", type: "error" })
        } finally {
            setIsProcessing(false)
            setDeleteTarget(null)
        }
    }

    const filteredPopoverAssistants = popoverAssistants.filter(a =>
        !popoverSearch || a.name.toLowerCase().includes(popoverSearch.toLowerCase())
    )

    const getAssistantColorByIndex = (assistantId: string) => {
        const idx = assistants.findIndex(a => a.id === assistantId)
        return getITAssistantColor(idx >= 0 ? idx : 0)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Part 1 — IT Assistant Roster */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">IT Assistants Roster</CardTitle>
                    <p className="text-sm text-muted-foreground">Drag an assistant onto a schedule cell, or click a cell to assign</p>
                </CardHeader>
                <CardContent className="pt-0">
                    {assistants.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No IT Assistants found. Mark students as IT Assistants from their profile.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {assistants.map((assistant, idx) => {
                                const color = getITAssistantColor(idx)
                                return (
                                    <div
                                        key={assistant.id}
                                        draggable
                                        onDragStart={() => handleDragStart(assistant)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing border border-border bg-card/60 hover:shadow-md transition-all select-none"
                                        title={`Drag to assign ${assistant.name}`}
                                    >
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                            <AvatarImage src={assistant.profile_picture_url || assistant.profile_picture || ""} />
                                            <AvatarFallback style={{ background: color.bg, color: color.text }} className="text-xs font-bold">
                                                {getInitials(assistant.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{assistant.name}</span>
                                        <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: color.bg }}
                                            title={color.name}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Part 2 — Schedule Grid */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Weekly IT Office Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">8:00 AM – 7:00 PM · Click a cell to assign · × to remove</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16 text-center font-semibold">Day</TableHead>
                                    {HOURS.map((h) => (
                                        <TableHead key={h} className="text-center text-xs font-medium min-w-[72px]">
                                            {formatHour(h)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {DAYS.map((day, dayIdx) => (
                                    <TableRow key={day}>
                                        <TableCell className="font-semibold text-center text-muted-foreground text-sm">{day}</TableCell>
                                        {HOURS.map((hour) => {
                                            const entries = getScheduleEntries(dayIdx, hour)
                                            const isDragHover = dragOver?.day === dayIdx && dragOver?.hour === hour
                                            const dragBlocked = draggingAssistant ? isブロックed(availability, draggingAssistant.id, dayIdx, hour) : false
                                            const isPopoverOpen = popoverCell?.day === dayIdx && popoverCell?.hour === hour

                                            let cellBg = ""
                                            if (isDragHover) {
                                                cellBg = dragBlocked
                                                    ? "bg-red-100 dark:bg-red-950/40 border-red-400"
                                                    : "bg-green-100 dark:bg-green-950/40 border-green-400"
                                            }

                                            return (
                                                <TableCell
                                                    key={hour}
                                                    className={`text-center p-1 cursor-pointer transition-colors border ${cellBg || "border-transparent hover:bg-muted/30"} relative align-top`}
                                                    onDragOver={(e) => handleDragOver(e, dayIdx, hour)}
                                                    onDragLeave={() => setDragOver(null)}
                                                    onDrop={(e) => handleDrop(e, dayIdx, hour)}
                                                    onClick={() => openPopover(dayIdx, hour)}
                                                >
                                                    <div className="flex flex-col gap-1 min-h-[40px] items-start justify-start p-0.5">
                                                        {entries.length > 0 ? (
                                                            <>
                                                                {entries.map(entry => {
                                                                    const color = getAssistantColorByIndex(entry.student_id)
                                                                    return (
                                                                        <div key={entry.id} className="relative group w-full">
                                                                            <div
                                                                                className="flex items-center gap-1.5 w-full py-1 px-1.5 bg-background/50 border border-border/50 rounded-sm shadow-sm hover:bg-muted/50 transition-colors"
                                                                                title={entry.student?.name}
                                                                            >
                                                                                <div
                                                                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                                                    style={{ backgroundColor: color.bg }}
                                                                                />
                                                                                <span className="text-[10px] text-foreground font-medium truncate leading-tight">
                                                                                    {entry.student ? entry.student.name : "?"}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-[&:hover]:opacity-100 transition-opacity z-10 shadow-sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setDeleteTarget(entry)
                                                                                    setShowDeleteConfirm(true)
                                                                                }}
                                                                                title="Remove"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                })}
                                                                <div className="w-full flex justify-center mt-0.5 opacity-0 hover:opacity-100 transition-opacity pb-0.5">
                                                                    <Plus className="w-3 h-3 text-muted-foreground" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full min-h-[30px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                <Plus className="w-3 h-3 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Click-to-assign Popover */}
                                                    {isPopoverOpen && (
                                                        <div
                                                            className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-3 w-56 top-8 left-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-medium text-muted-foreground">
                                                                    {DAYS[dayIdx]} {formatHour(hour)}
                                                                </span>
                                                                <button onClick={() => setPopoverCell(null)} className="text-muted-foreground hover:text-foreground">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <Input
                                                                placeholder="Search assistant..."
                                                                value={popoverSearch}
                                                                onChange={(e) => setPopoverSearch(e.target.value)}
                                                                className="h-7 text-xs mb-2"
                                                            />
                                                            {popoverLoading ? (
                                                                <div className="flex justify-center py-3">
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                </div>
                                                            ) : filteredPopoverAssistants.length === 0 ? (
                                                                <p className="text-xs text-muted-foreground text-center py-2">No available assistants</p>
                                                            ) : (
                                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                                    {filteredPopoverAssistants.map((a) => {
                                                                        const idx = assistants.findIndex(x => x.id === a.id)
                                                                        const color = getITAssistantColor(idx >= 0 ? idx : 0)
                                                                        return (
                                                                            <button
                                                                                key={a.id}
                                                                                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                                                                                onClick={() => assignAssistant(a, dayIdx, hour)}
                                                                            >
                                                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color.bg }} />
                                                                                <span className="text-xs">{a.name}</span>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <ConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }}
                onConfirm={() => { setShowDeleteConfirm(false); handleDeleteConfirm() }}
                title="Remove Schedule Slot"
                description={`Remove ${deleteTarget?.student?.name || "this assistant"} from this time slot?`}
                confirmText="Remove"
                cancelText="Cancel"
                variant="destructive"
            />

            <LoadingDialog
                isOpen={isProcessing}
                title="Processing..."
                description="Please wait while we save your changes."
            />

            <StatusDialog
                isOpen={statusDialog.isOpen}
                onClose={() => setStatusDialog(p => ({ ...p, isOpen: false }))}
                title={statusDialog.title}
                description={statusDialog.description}
                type={statusDialog.type}
            />
        </div>
    )
}

// Fix: use the correct isBlocked helper name consistently
function isブロックed(availability: Availability[], studentId: string, dayOfWeek: number, hour: number): boolean {
    return availability.some((a) => {
        if (a.student_id !== studentId) return false
        if (a.status !== "class" && a.status !== "unavailable") return false
        const date = new Date(a.date)
        const avDow = date.getDay()
        if (avDow !== dayOfWeek) return false
        const [startH] = a.start_time.split(":").map(Number)
        const [endH] = a.end_time.split(":").map(Number)
        return hour >= startH && hour < endH
    })
}
