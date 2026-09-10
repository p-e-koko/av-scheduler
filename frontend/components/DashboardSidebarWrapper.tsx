"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStoredUser, type User } from "@/lib/api"
import { SupervisorSidebar } from "@/components/SupervisorSidebar"
import { CoordinatorSidebar } from "@/components/CoordinatorSidebar"
import { StudentSidebar } from "@/components/StudentSidebar"
import { AdminSidebar } from "@/components/AdminSidebar"

/**
 * Wraps sub-pages (Inventory, Keys, Receivers) with the user's
 * role-appropriate sidebar so it stays visible during navigation.
 */
export function DashboardSidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        const user = getStoredUser()
        if (user) setCurrentUser(user)
    }, [])

    if (!currentUser) {
        return <>{children}</>
    }

    const role = currentUser.role?.toLowerCase() ?? "student"

    const renderSidebar = () => {
        // We pass a dummy activeTab since none of the sidebar's own tabs are active
        // on these sub-pages. The sidebar highlights Inventory/Keys/Receivers
        // via pathname matching already built into each sidebar.
        switch (role) {
            case "admin":
                return (
                    <AdminSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )
            case "supervisor":
                return (
                    <SupervisorSidebar
                        activeTab={"dashboard"}
                        onTabChange={() => { }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )
            case "coordinator":
                return (
                    <CoordinatorSidebar
                        activeTab={"assignments"}
                        onTabChange={() => { }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        user={currentUser}
                    />
                )
            case "student":
            default:
                return (
                    <StudentSidebar
                        activeTab={"profile"}
                        onTabChange={() => { }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )
        }
    }

    return (
        <div className="flex h-screen bg-background">
            {renderSidebar()}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                {/* Mobile menu button — only shown on small screens */}
                <div className="md:hidden absolute top-4 left-4 z-20">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>
                {children}
            </div>
        </div>
    )
}
