"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Loader2, Search, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    itOfficeScheduleAPI,
    type User,
    type ITOfficeSchedule,
} from "@/lib/api"
import { getITAssistantColor } from "@/lib/it-assistant-colors"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

const formatHour = (h: number) => {
    if (h === 12) return "12:00pm"
    if (h > 12) return `${h - 12}:00pm`
    return `${h}:00am`
}

const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

export function ITOfficeAssistantsPage() {
    const [assistants, setAssistants] = useState<User[]>([])
    const [schedules, setSchedules] = useState<ITOfficeSchedule[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true)
            const [assistantsRes, schedulesRes] = await Promise.all([
                itOfficeScheduleAPI.getITAssistants(),
                itOfficeScheduleAPI.getSchedules(),
            ])
            setAssistants(assistantsRes.data)
            setSchedules(schedulesRes.data)
        } catch (err) {
            console.error("Failed to load IT Assistants", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    const getAssistantSchedules = (assistantId: string) =>
        schedules.filter((s) => s.student_id === assistantId)

    const getScheduledHoursPerWeek = (assistantId: string) => {
        const entries = getAssistantSchedules(assistantId)
        return entries.length // each entry is 1 hour
    }

    const filteredAssistants = assistants.filter(
        (a) =>
            !search ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.email.toLowerCase().includes(search.toLowerCase())
    )

    // Build grid data: for each (day, hour), list assigned assistants
    const getAssistantsForCell = (day: number, hour: number) => {
        return schedules
            .filter(
                (s) =>
                    s.day_of_week === day &&
                    parseInt(s.start_time.split(":")[0]) === hour
            )
            .map((s) => {
                const assistant = assistants.find((a) => a.id === s.student_id)
                const idx = assistants.findIndex((a) => a.id === s.student_id)
                return { schedule: s, assistant, colorIndex: idx >= 0 ? idx : 0 }
            })
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
            {/* Header + Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assistants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Users className="w-3 h-3 mr-1" />
                    {assistants.length} IT Assistants
                </Badge>
            </div>

            {/* Weekly Overview Grid */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg">Weekly IT Office Coverage</CardTitle>
                    <p className="text-sm text-muted-foreground">Overview of all IT Assistants across the week</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16 text-center">Day</TableHead>
                                    {HOURS.map((h) => (
                                        <TableHead key={h} className="text-center text-xs min-w-[64px]">
                                            {formatHour(h)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {DAYS.map((day, dayIdx) => (
                                    <TableRow key={day}>
                                        <TableCell className="font-semibold text-center text-muted-foreground">{day}</TableCell>
                                        {HOURS.map((hour) => {
                                            const cellAssistants = getAssistantsForCell(dayIdx, hour)
                                            return (
                                                <TableCell key={hour} className="text-center p-1">
                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                        {cellAssistants.map(({ schedule, assistant, colorIndex }) => {
                                                            const color = getITAssistantColor(colorIndex)
                                                            return (
                                                                <div
                                                                    key={schedule.id}
                                                                    title={assistant?.name || "Unknown"}
                                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                                    style={{ background: color.bg, color: color.text }}
                                                                >
                                                                    {assistant ? getInitials(assistant.name) : "?"}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
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

            {/* Per-Assistant Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAssistants.map((assistant, idx) => {
                    const color = getITAssistantColor(idx)
                    const assistantSchedules = getAssistantSchedules(assistant.id)
                    const hoursPerWeek = getScheduledHoursPerWeek(assistant.id)

                    // Group by day
                    const byDay: Record<number, ITOfficeSchedule[]> = {}
                    assistantSchedules.forEach((s) => {
                        if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []
                        byDay[s.day_of_week].push(s)
                    })

                    return (
                        <Card
                            key={assistant.id}
                            className="bg-card/90 backdrop-blur-xl border-border shadow hover:shadow-lg transition-shadow"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                        <AvatarImage src={assistant.profile_picture_url || assistant.profile_picture || ""} />
                                        <AvatarFallback
                                            style={{ background: color.bg, color: color.text }}
                                            className="text-sm font-bold"
                                        >
                                            {getInitials(assistant.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground truncate">{assistant.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{assistant.email}</p>
                                    </div>
                                    <Badge
                                        className="text-xs border-0"
                                        style={{ background: color.bg, color: color.text }}
                                    >
                                        {hoursPerWeek}h/week
                                    </Badge>
                                </div>

                                {assistantSchedules.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No schedule assigned yet.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {DAYS.map((dayName, dayIdx) => {
                                            const daySlots = byDay[dayIdx]
                                            if (!daySlots || daySlots.length === 0) return null
                                            return (
                                                <div key={dayIdx} className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground w-8">{dayName}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {daySlots
                                                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                                            .map((slot) => (
                                                                <Badge
                                                                    key={slot.id}
                                                                    variant="outline"
                                                                    className="text-[10px] px-1.5 py-0.5 font-normal"
                                                                >
                                                                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
                {filteredAssistants.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        No IT Assistants found
                    </div>
                )}
            </div>
        </div>
    )
}
