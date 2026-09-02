"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { StudentAmbassadorSidebar } from "@/components/StudentAmbassadorSidebar"
import { MarketingSupervisorSchedulePage } from "@/components/MarketingSupervisorSchedulePage"
import { getStoredUser, type User } from "@/lib/api"

type Tab = "assignments" | "availability" | "supervisor-schedule"

export default function StudentAmbassadorDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("assignments")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const stored = getStoredUser()
        if (stored) setUser(stored)
    }, [])

    return (
        <RoleProtectedRoute allowedRoles={["student_ambassador", "admin"]}>
            <div className="flex h-screen bg-background overflow-hidden">
                <StudentAmbassadorSidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    user={user}
                />

                <main className="flex-1 overflow-y-auto">
                    {/* Mobile Header */}
                    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </Button>
                        <span className="font-semibold text-foreground">Student Ambassador</span>
                    </div>

                    <div className="p-6">
                        {activeTab === "assignments" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">My Assignments</h2>
                                <p className="text-muted-foreground">
                                    View and accept your marketing assignments below. You can accept assignments to add them to your schedule.
                                </p>
                                {/* TODO: MarketingAssignmentDetailModal (accept-only, no reject) */}
                            </div>
                        )}

                        {activeTab === "availability" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">My Availability</h2>
                                <p className="text-muted-foreground">
                                    Set your class times, availability windows, and unavailability periods
                                    so the coordinator can schedule you appropriately.
                                </p>
                                {/* TODO: CalendarComponent + AddAvailabilityModal (same as AV student) */}
                            </div>
                        )}

                        {activeTab === "supervisor-schedule" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Supervisor Schedule</h2>
                                <p className="text-muted-foreground mb-4">
                                    View when your marketing supervisors are in the office.
                                </p>
                                <div className="h-[600px] bg-background">
                                    <MarketingSupervisorSchedulePage canUpload={false} />
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </RoleProtectedRoute>
    )
}
