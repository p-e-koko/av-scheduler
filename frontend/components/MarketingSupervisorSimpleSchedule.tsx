import React, { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Calendar } from "lucide-react"

export function MarketingSupervisorSimpleSchedule() {
    const [schedules, setSchedules] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSchedules()
    }, [])

    const fetchSchedules = async () => {
        try {
            setLoading(true)
            const data = await api.get('/marketing-supervisor-schedules')
            setSchedules((data as any).data || data)
        } catch (error) {
            console.error('Failed to fetch supervisor schedules:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter out any users with no schedules and organize by day
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    const getSchedulesForDay = (dayName: string) => {
        const dailySchedules: Array<{ user: string, title: string, startTime: string, endTime: string }> = []

        schedules.forEach((slot: any) => {
            const start = new Date(slot.start_datetime)
            const end = new Date(slot.end_datetime)

            // Match day of week - JS getDay() returns 1 for Monday, 5 for Friday
            const dayIndex = daysOfWeek.indexOf(dayName) + 1

            if (start.getDay() === dayIndex) {
                dailySchedules.push({
                    user: slot.supervisor?.name || 'Supervisor',
                    title: slot.title,
                    startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })
            }
        })

        // Sort by start time then by user
        return dailySchedules.sort((a, b) => {
            if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
            return a.user.localeCompare(b.user)
        })
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {daysOfWeek.map(day => {
                const dailySlots = getSchedulesForDay(day)
                return (
                    <Card key={day} className="bg-card/80 backdrop-blur-xl border-border shadow-md">
                        <CardHeader className="bg-muted/50 border-b border-border py-4">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                {day}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {dailySlots.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {dailySlots.map((slot, idx) => (
                                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="font-medium text-foreground text-lg mb-1 sm:mb-0">
                                                {slot.user}
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-muted-foreground bg-muted/50 sm:bg-transparent p-2 sm:p-0 rounded sm:rounded-none">
                                                <div className="bg-primary/10 text-primary-medium px-3 py-1 rounded-full text-sm font-semibold inline-block border border-primary/20">
                                                    {slot.startTime} - {slot.endTime}
                                                </div>
                                                <div className="text-sm border-l-0 sm:border-l sm:border-border sm:pl-4">
                                                    {slot.title}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-muted-foreground italic bg-muted/20">
                                    No supervisor hours scheduled.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
