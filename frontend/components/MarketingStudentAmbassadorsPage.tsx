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
    api,
    availabilityAPI,
    type User,
    type Availability,
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

function isBlocked(availability: Availability[], studentId: string, dayOfWeek: number, hour: number): boolean {
    return availability.some((a) => {
        if (a.student_id !== studentId) return false
        if (a.status !== "class" && a.status !== "unavailable") return false

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

export function MarketingStudentAmbassadorsPage() {
    const [assistants, setAssistants] = useState<User[]>([])
    const [availability, setAvailability] = useState<Availability[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true)
            const [assistantsRes] = await Promise.all([
                api.get('/users?role=student_ambassador&per_page=1000'),
            ])
            const usersList = (assistantsRes as any).data || (assistantsRes as any).users || assistantsRes
            setAssistants(usersList as User[])
            if (usersList.length > 0) {
                const ids = usersList.map((a: any) => a.id)

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
            console.error("Failed to load Student Ambassadors", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])



    const filteredAssistants = assistants.filter(
        (a) =>
            !search ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.email.toLowerCase().includes(search.toLowerCase())
    )

    // Build grid data: list available assistants
    const getAvailableAssistantsForCell = (day: number, hour: number) => {
        return assistants
            .filter((a) => !isBlocked(availability, a.id, day, hour))
            .map((assistant) => {
                const idx = assistants.findIndex((a) => a.id === assistant.id)
                return { assistant, schedule: null, colorIndex: idx >= 0 ? idx : 0 }
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


            {/* Weekly Overview Grid */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg">Student Ambassadors Availability Matrix</CardTitle>
                    <p className="text-sm text-muted-foreground">Overview of available student ambassadors for each time slot</p>
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
                                            const cellAssistants = getAvailableAssistantsForCell(dayIdx, hour)
                                            return (
                                                <TableCell key={hour} className="p-1 border align-top">
                                                    <div className="flex flex-col gap-1 min-h-[40px] items-start justify-start p-0.5">
                                                        {cellAssistants.map(({ schedule, assistant, colorIndex }) => {
                                                            const color = getITAssistantColor(colorIndex)
                                                            return (
                                                                <div
                                                                    key={assistant?.id || Math.random().toString()}
                                                                    className="flex items-center gap-1.5 w-full py-1 px-1.5 bg-background/50 border border-border/50 rounded-sm shadow-sm hover:bg-muted/50 transition-colors"
                                                                    title={assistant?.name || "Unknown"}
                                                                >
                                                                    <div
                                                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: color.bg }}
                                                                    />
                                                                    <span className="text-[10px] text-foreground font-medium truncate leading-tight">
                                                                        {assistant ? assistant.name : "?"}
                                                                    </span>
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

            {/* Per-Assistant Availability */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 pt-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">Per-Ambassador Availability Detail</h3>
                    <p className="text-sm text-muted-foreground">List of exact available time windows for each ambassador</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
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
                        {assistants.length}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAssistants.map((assistant, idx) => {
                    const color = getITAssistantColor(idx)

                    // Group availability by day dynamically
                    const assistantAvailBlocks: Record<number, { start: number, end: number }[]> = {}
                    let totalAvailHours = 0

                    DAYS.forEach((_, dayIdx) => {
                        const blocks: { start: number, end: number }[] = []
                        let currentStart: number | null = null;

                        HOURS.forEach((hour, i) => {
                            const isAvail = !isBlocked(availability, assistant.id, dayIdx, hour)
                            if (isAvail) {
                                totalAvailHours++
                                if (currentStart === null) currentStart = hour
                                if (i === HOURS.length - 1) {
                                    blocks.push({ start: currentStart, end: hour + 1 })
                                }
                            } else {
                                if (currentStart !== null) {
                                    blocks.push({ start: currentStart, end: hour })
                                    currentStart = null
                                }
                            }
                        })
                        if (blocks.length > 0) assistantAvailBlocks[dayIdx] = blocks
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
                                        {totalAvailHours}h avail
                                    </Badge>
                                </div>

                                {totalAvailHours === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No availability found.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {DAYS.map((dayName, dayIdx) => {
                                            const dayBlocks = assistantAvailBlocks[dayIdx]
                                            if (!dayBlocks || dayBlocks.length === 0) return null
                                            return (
                                                <div key={dayIdx} className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground w-8">{dayName}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {dayBlocks.map((block, bIdx) => (
                                                            <Badge
                                                                key={bIdx}
                                                                variant="outline"
                                                                className="text-[10px] px-1.5 py-0.5 font-normal"
                                                            >
                                                                {formatHour(block.start).replace(':00', '')}–{formatHour(block.end).replace(':00', '')}
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
                        No Student Ambassadors found
                    </div>
                )}
            </div>
        </div>
    )
}
