"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Loader2, Monitor } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    type ITOfficeSchedule,
} from "@/lib/api"
import { getStoredUser } from "@/lib/api"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

const formatHour = (h: number) => {
    if (h === 12) return "12:00pm"
    if (h > 12) return `${h - 12}:00pm`
    return `${h}:00am`
}

export function ITOfficeScheduleAssistantView() {
    const [schedules, setSchedules] = useState<ITOfficeSchedule[]>([])
    const [loading, setLoading] = useState(true)

    const currentUser = getStoredUser()

    const fetchSchedules = useCallback(async () => {
        try {
            setLoading(true)
            const res = await itOfficeScheduleAPI.getSchedules() // Backend scopes this to my own schedules for student role
            setSchedules(res.data)
        } catch (err) {
            console.error("Failed to load IT Office Schedule", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSchedules()
    }, [fetchSchedules])

    const getScheduleEntry = (day: number, hour: number) => {
        return schedules.find(
            (s) =>
                s.day_of_week === day &&
                parseInt(s.start_time.split(":")[0]) === hour
        )
    }

    // Group by day for the list view
    const byDay: Record<number, ITOfficeSchedule[]> = {}
    schedules.forEach((s) => {
        if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []
        byDay[s.day_of_week].push(s)
    })

    // Next upcoming shift
    const getNextShift = () => {
        if (schedules.length === 0) return null
        const now = new Date()
        const currentDay = now.getDay()
        const currentHour = now.getHours()

        // Try to find a shift later today
        let todaysRemaining = schedules.filter(
            (s) => s.day_of_week === currentDay && parseInt(s.start_time.split(":")[0]) > currentHour
        )

        if (todaysRemaining.length > 0) {
            todaysRemaining.sort((a, b) => a.start_time.localeCompare(b.start_time))
            return { dayName: "Today", slot: todaysRemaining[0] }
        }

        // Otherwise find the first shift on subsequent days
        for (let i = 1; i <= 7; i++) {
            const targetDay = (currentDay + i) % 7
            if (targetDay === 6) continue // Sat skipped
            let daySlots = schedules.filter((s) => s.day_of_week === targetDay)
            if (daySlots.length > 0) {
                daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
                const dayStr = i === 1 ? "Tomorrow" : DAYS[targetDay]
                return { dayName: dayStr, slot: daySlots[0] }
            }
        }
        return null
    }

    const nextShift = getNextShift()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Overview Top Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/90 backdrop-blur-xl border-border shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Assigned Weekly Hours</p>
                                <p className="text-2xl font-bold">{schedules.length}h</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/90 backdrop-blur-xl border-border shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Next Scheduled Shift</p>
                            {nextShift ? (
                                <div className="flex items-baseline gap-2">
                                    <p className="text-lg font-bold">{nextShift.dayName}</p>
                                    <p className="text-muted-foreground text-sm">
                                        {nextShift.slot.start_time.slice(0, 5)} – {nextShift.slot.end_time.slice(0, 5)}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">No upcoming shifts this week</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid View (Desktop) */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg overflow-hidden hidden md:block">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Weekly View</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20 text-center font-semibold">Day</TableHead>
                                {HOURS.map((h) => (
                                    <TableHead key={h} className="text-center text-xs font-medium">
                                        {formatHour(h).replace(":00", "")}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {DAYS.map((day, dayIdx) => (
                                <TableRow key={day}>
                                    <TableCell className="font-semibold text-center text-muted-foreground text-sm">{day}</TableCell>
                                    {HOURS.map((hour) => {
                                        const entry = getScheduleEntry(dayIdx, hour)
                                        return (
                                            <TableCell
                                                key={hour}
                                                className={`text-center p-1 border ${entry ? "bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30" : "border-transparent"}`}
                                            >
                                                {entry && (
                                                    <div className="w-full h-8 flex items-center justify-center rounded bg-primary/20 dark:bg-primary/40 text-primary dark:text-white font-medium text-xs">
                                                        Shift
                                                    </div>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* List View (Mobile) */}
            <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg md:hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Weekly View</CardTitle>
                </CardHeader>
                <CardContent>
                    {schedules.length === 0 ? (
                        <p className="text-muted-foreground text-sm">You have no scheduled IT Office hours.</p>
                    ) : (
                        <div className="space-y-4">
                            {DAYS.map((dayName, dayIdx) => {
                                const daySlots = byDay[dayIdx]
                                if (!daySlots || daySlots.length === 0) return null
                                return (
                                    <div key={dayIdx} className="flex flex-col space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
                                        <h4 className="font-semibold text-foreground text-sm">{dayName}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {daySlots
                                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                                .map((slot) => (
                                                    <Badge key={slot.id} variant="secondary" className="px-2 py-1 font-normal bg-primary/10 dark:bg-primary/20 text-primary dark:text-white hover:bg-primary/20 dark:hover:bg-primary/30">
                                                        {formatHour(parseInt(slot.start_time.split(":")[0]))} – {formatHour(parseInt(slot.end_time.split(":")[0]))}
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
        </div>
    )
}
