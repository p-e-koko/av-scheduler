import React, { useState, useEffect } from "react"
import { api, userAPI, User } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Calendar, User as UserIcon } from "lucide-react"

export function MarketingSupervisorSimpleSchedule() {
    const [schedules, setSchedules] = useState<any[]>([])
    const [supervisorsList, setSupervisorsList] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSchedules()
    }, [])

    const fetchSchedules = async () => {
        try {
            setLoading(true)
            const [schedulesData, usersData]: any = await Promise.all([
                api.get('/marketing-supervisor-schedules'),
                userAPI.getUsers({ role: 'marketing_supervisor' })
            ])
            setSchedules(schedulesData.data || schedulesData)
            setSupervisorsList(usersData.data || usersData)
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    // Group schedules by supervisor name
    const groupedBySupervisor = schedules.reduce((acc: any, slot: any) => {
        const supervisorName = slot.supervisor?.name || 'Supervisor'
        if (!acc[supervisorName]) {
            acc[supervisorName] = []
        }

        const start = new Date(slot.start_datetime)
        const end = new Date(slot.end_datetime)

        // Match day of week - JS getDay() returns 1 for Monday, 5 for Friday
        const startDay = start.getDay() // 1 = Monday, ..., 5 = Friday

        // Create an entry only if it falls on Mon-Fri
        if (startDay >= 1 && startDay <= 5) {
            const dayName = daysOfWeek[startDay - 1]
            acc[supervisorName].push({
                dayName,
                dayIndex: startDay,
                title: slot.title,
                startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                startObj: start
            })
        }

        return acc
    }, {})

    // We use the fetched supervisorsList to determine the columns.
    // If a supervisor has no schedules, they'll just not have a key in groupedBySupervisor.
    // We sort the users by name just to have a stable order.
    const displaySupervisors = [...supervisorsList].sort((a, b) => a.name.localeCompare(b.name))

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-marketing-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {displaySupervisors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displaySupervisors.map(user => {
                        const name = user.name
                        const supervisorSlots = groupedBySupervisor[name] || []

                        return (
                            <Card key={user.id} className="bg-card/80 backdrop-blur-xl border-border shadow-md h-fit">
                                <CardHeader className="bg-muted/50 border-b border-border py-4">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-marketing-600" />
                                        {name}'s Schedule
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {daysOfWeek.map((day) => {
                                            // Get slots for this day specifically
                                            const daySlots = supervisorSlots
                                                .filter((s: any) => s.dayName === day)
                                                .sort((a: any, b: any) => a.startObj.getTime() - b.startObj.getTime())

                                            return (
                                                <div key={day} className="p-4 hover:bg-muted/30 transition-colors">
                                                    <div className="font-semibold text-lg flex items-center gap-2 text-marketing-700 mb-3 border-b border-marketing-200/50 pb-2">
                                                        <Calendar className="h-4 w-4" />
                                                        {day}
                                                    </div>

                                                    {daySlots.length > 0 ? (
                                                        <div className="space-y-3 pl-6">
                                                            {daySlots.map((slot: any, slotIdx: number) => (
                                                                <div key={slotIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                                    <div className="bg-marketing-100 text-marketing-800 px-3 py-1 rounded-full text-sm font-semibold inline-block shadow-sm">
                                                                        {slot.startTime} - {slot.endTime}
                                                                    </div>
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        {slot.title}
                                                                    </div>
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
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="p-12 text-center text-muted-foreground italic bg-muted/20 rounded-xl border border-border">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-marketing-200" />
                    No marketing supervisors found.
                </div>
            )}
        </div>
    )
}
