"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type User, type Availability } from "@/lib/api"

interface DailyAvailabilityViewProps {
    selectedDate: string
    setSelectedDate: (date: string) => void
    students: User[]
    availability: Availability[]
    loading: boolean
}

export function DailyAvailabilityView({
    selectedDate,
    setSelectedDate,
    students,
    availability,
    loading
}: DailyAvailabilityViewProps) {

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate)
        date.setDate(date.getDate() + days)
        setSelectedDate(date.toISOString().split('T')[0])
    }

    // Pre-defined colors for avatars as seen in reference image
    const avatarColors = [
        { bg: "bg-[#F39C12]", border: "border-[#D68910]" }, // Orange/Yellow
        { bg: "bg-[#27AE60]", border: "border-[#1E8449]" }, // Green
        { bg: "bg-[#E67E22]", border: "border-[#BA4A00]" }, // Deep Orange
        { bg: "bg-[#9B59B6]", border: "border-[#7D3C98]" }, // Purple
        { bg: "bg-[#2980B9]", border: "border-[#1F618D]" }, // Blue
        { bg: "bg-[#E74C3C]", border: "border-[#C0392B]" }, // Red
        { bg: "bg-[#16A085]", border: "border-[#117864]" }, // Teal
    ]

    const getAvatarStyle = (seed: string) => {
        const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length
        return avatarColors[index]
    }

    const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 to 21:00

    return (
        <Card className="bg-[#121214] border-[#1E1E21] shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between p-6 gap-4 border-b border-[#1E1E21]">
                <CardTitle className="text-xl font-bold text-white tracking-tight">Daily Availability View</CardTitle>

                <div className="flex items-center bg-[#1E1E21] rounded-xl border border-[#2A2A2E] p-1.5 shadow-inner">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-[#2A2A2E] rounded-lg text-gray-400 hover:text-white transition-all"
                        onClick={() => navigateDate(-1)}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="flex items-center px-3 gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-auto border-0 focus-visible:ring-0 h-8 font-semibold text-sm text-white bg-transparent p-0 cursor-pointer"
                        />
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-[#2A2A2E] rounded-lg text-gray-400 hover:text-white transition-all"
                        onClick={() => navigateDate(1)}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <div className="space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400 font-medium">Loading availability data...</p>
                        </div>
                    ) : (
                        hours.map((hour) => {
                            const timeString = `${hour.toString().padStart(2, '0')}:00`;

                            // Filter students who are available at this hour
                            const availableStudents = students.filter(student => {
                                const conflicts = availability.filter(a => {
                                    const studentMatch = a.student_id === student.id || a.student_id === student.id.toString();
                                    if (!studentMatch) return false;

                                    // Only blocking statuses
                                    if (a.status !== 'class' && a.status !== 'unavailable') return false;

                                    const [startH] = a.start_time.split(':').map(Number);
                                    const [endH] = a.end_time.split(':').map(Number);

                                    return hour >= startH && hour < endH;
                                });
                                return conflicts.length === 0;
                            }).sort((a, b) => a.name.localeCompare(b.name));

                            return (
                                <div key={hour} className="flex flex-col space-y-4 group">
                                    <div className="flex items-center gap-4">
                                        <div className="min-w-[70px] font-bold text-gray-400 group-hover:text-white transition-colors">
                                            {timeString}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#FAA300] shadow-[0_0_8px_rgba(250,163,0,0.5)]" />
                                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                                {availableStudents.length} students available
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pl-0 md:pl-[70px]">
                                        {availableStudents.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                                {availableStudents.map((student) => {
                                                    const style = getAvatarStyle(student.id.toString());
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className="flex items-center gap-3 bg-[#1E1E21]/50 border border-[#2A2A2E] rounded-xl pl-2.5 pr-4 py-2 hover:bg-[#2A2A2E] hover:border-[#3A3A3E] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-sm group/card"
                                                            onClick={() => window.location.href = `/student/${student.id}`}
                                                        >
                                                            <Avatar className={cn("h-8 w-8 ring-2 ring-offset-2 ring-offset-[#121214]", style.border)}>
                                                                <AvatarImage src={student.profile_picture_url || ""} />
                                                                <AvatarFallback className={cn("text-[10px] font-black text-white", style.bg)}>
                                                                    {getInitials(student.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[13px] font-semibold text-gray-300 group-hover/card:text-white truncate tracking-tight">
                                                                {student.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-xs font-medium text-gray-600 italic pl-2 border-l-2 border-[#1E1E21]">
                                                No students available during this period
                                            </div>
                                        )}
                                    </div>

                                    {hour !== 21 && (
                                        <div className="h-px w-full bg-[#1E1E21] mt-2" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
