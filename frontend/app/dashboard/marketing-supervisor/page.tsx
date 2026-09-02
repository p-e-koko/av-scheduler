"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { MarketingSupervisorSidebar } from "@/components/MarketingSupervisorSidebar"
import { MarketingSupervisorSchedulePage } from "@/components/MarketingSupervisorSchedulePage"
import { MarketingEquipmentPage } from "@/components/MarketingEquipmentPage"
import { MarketingStudentAmbassadorsPage } from "@/components/MarketingStudentAmbassadorsPage"
import { CreateMarketingAssignmentModal } from "@/components/CreateMarketingAssignmentModal"
import { MarketingAssignmentsList } from "@/components/MarketingAssignmentsList"
import { getStoredUser, type User } from "@/lib/api"

type Tab = "students" | "assignments" | "my-schedule" | "equipment"

export default function MarketingSupervisorDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("students")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
        const stored = getStoredUser()
        if (stored) setUser(stored)
    }, [])

    return (
        <RoleProtectedRoute allowedRoles={["marketing_supervisor", "admin"]}>
            <div className="flex h-screen bg-background overflow-hidden">
                <MarketingSupervisorSidebar
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
                        <span className="font-semibold text-foreground">Marketing Supervisor</span>
                    </div>

                    <div className="p-6">
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

                        {activeTab === "assignments" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Marketing Assignments</h2>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-muted-foreground">
                                        Manage event and recording assignments for the marketing team.
                                    </p>
                                    <Button onClick={() => setShowCreateModal(true)} className="bg-marketing-700 hover:bg-marketing-800 text-white">Create Assignment</Button>
                                </div>
                                <MarketingAssignmentsList readonly={false} />
                                <CreateMarketingAssignmentModal
                                    isOpen={showCreateModal}
                                    onClose={() => setShowCreateModal(false)}
                                    onAssignmentCreated={() => { }}
                                />
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

                        {activeTab === "my-schedule" && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">My Schedule</h2>
                                <p className="text-muted-foreground mb-4">
                                    Manage your office hours so ambassadors know when you are available.
                                    Upload or add your schedule entries below.
                                </p>
                                <div className="h-[600px] bg-background">
                                    <MarketingSupervisorSchedulePage canUpload={true} />
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </RoleProtectedRoute>
    )
}
