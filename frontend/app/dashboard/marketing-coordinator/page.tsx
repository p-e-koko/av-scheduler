"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { MarketingCoordinatorSidebar } from "@/components/MarketingCoordinatorSidebar"
import { MarketingEquipmentPage } from "@/components/MarketingEquipmentPage"
import { MarketingSupervisorSimpleSchedule } from "@/components/MarketingSupervisorSimpleSchedule"
import { CreateMarketingAssignmentModal } from "@/components/CreateMarketingAssignmentModal"
import { MarketingStudentAmbassadorsPage } from "@/components/MarketingStudentAmbassadorsPage"
import { getStoredUser, type User } from "@/lib/api"

type Tab = "assignments" | "students" | "equipment" | "schedules" | "recycle-bin"

export default function MarketingCoordinatorDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("assignments")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
        const stored = getStoredUser()
        if (stored) setUser(stored)
    }, [])

    return (
        <RoleProtectedRoute allowedRoles={["marketing_coordinator", "admin"]}>
            <div className="flex h-screen bg-background overflow-hidden">
                <MarketingCoordinatorSidebar
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
                        <span className="font-semibold text-foreground">Marketing Coordinator</span>
                    </div>

                    <div className="p-6">
                        {activeTab === "assignments" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Marketing Assignments</h2>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-muted-foreground">
                                        Manage event and recording assignments for the marketing team.
                                    </p>
                                    <Button onClick={() => setShowCreateModal(true)} className="bg-marketing-600 hover:bg-marketing-700 text-white">Create Assignment</Button>
                                </div>
                                {/* TODO: MarketingAssignmentsList integration */}
                                <CreateMarketingAssignmentModal
                                    isOpen={showCreateModal}
                                    onClose={() => setShowCreateModal(false)}
                                    onAssignmentCreated={() => { }}
                                />
                            </div>
                        )}

                        {activeTab === "students" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Student Ambassadors</h2>
                                    <p className="text-muted-foreground">
                                        View and manage student ambassadors in the marketing department.
                                    </p>
                                </div>
                                <MarketingStudentAmbassadorsPage />
                            </div>
                        )}

                        {activeTab === "equipment" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Marketing Equipment</h2>
                                <p className="text-muted-foreground mb-4">
                                    Manage marketing equipment inventory and track usage.
                                </p>
                                <MarketingEquipmentPage readonly={false} />
                            </div>
                        )}

                        {activeTab === "schedules" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Supervisor Schedules</h2>
                                <p className="text-muted-foreground mb-4">
                                    View the marketing supervisors' office hours and schedules.
                                </p>
                                <MarketingSupervisorSimpleSchedule />
                            </div>
                        )}

                        {activeTab === "recycle-bin" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Recycle Bin</h2>
                                <p className="text-muted-foreground">
                                    Restore soft-deleted assignments and equipment.
                                </p>
                                {/* TODO: RecycleBin for marketing */}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </RoleProtectedRoute>
    )
}
