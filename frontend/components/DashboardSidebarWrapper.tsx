"use client"

import React, { useState, useEffect, createContext, useContext } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStoredUser, type User } from "@/lib/api"
import { SupervisorSidebar } from "@/components/SupervisorSidebar"
import { CoordinatorSidebar } from "@/components/CoordinatorSidebar"
import { StudentSidebar } from "@/components/StudentSidebar"
import { AdminSidebar } from "@/components/AdminSidebar"
import { CustomerSidebar } from "@/components/CustomerSidebar"

interface DashboardSidebarContextType {
    isSidebarOpen: boolean
    setIsSidebarOpen: (open: boolean) => void
    openSidebar: () => void
}

const DashboardSidebarContext = createContext<DashboardSidebarContextType | undefined>(undefined)

export const useDashboardSidebar = () => useContext(DashboardSidebarContext)

export function MobileSidebarTrigger({ className = "" }: { className?: string }) {
    const context = useContext(DashboardSidebarContext)
    if (!context) return null
    return (
        <Button
            variant="ghost"
            size="icon"
            className={`md:hidden text-foreground hover:bg-accent ${className}`}
            onClick={context.openSidebar}
            aria-label="Open navigation menu"
        >
            <Menu className="h-6 w-6 text-foreground" />
        </Button>
    )
}

/**
 * Wraps sub-pages (Inventory, Keys, Receivers) with the user's
 * role-appropriate sidebar so it stays visible during navigation.
 */
export function DashboardSidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        const user = getStoredUser()
        if (user) setCurrentUser(user)
    }, [])

    if (!currentUser) {
        return <>{children}</>
    }

    const userRoles = (currentUser.roles && currentUser.roles.length > 0)
        ? currentUser.roles.map(r => r.toLowerCase())
        : [currentUser.role?.toLowerCase() ?? "student"]

    let role = "student"
    if (userRoles.includes("admin")) role = "admin"
    else if (userRoles.includes("supervisor")) role = "supervisor"
    else if (userRoles.includes("coordinator")) role = "coordinator"
    else if (userRoles.includes("customer")) role = "customer"
    else if (userRoles.includes("student")) role = "student"

    const handleTabChange = (targetDashboard: string, tab: string) => {
        setIsSidebarOpen(false)
        router.push(`/dashboard/${targetDashboard}?tab=${tab}`)
    }

    const renderSidebar = () => {
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
                        onTabChange={(tab) => handleTabChange("supervisor", tab)}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )
            case "coordinator":
                return (
                    <CoordinatorSidebar
                        activeTab={"assignments"}
                        onTabChange={(tab) => handleTabChange("coordinator", tab)}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        user={currentUser}
                    />
                )
            case "customer":
                return (
                    <CustomerSidebar
                        activeTab={"book"}
                        onTabChange={(tab) => handleTabChange("customer", tab)}
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
                        onTabChange={(tab) => handleTabChange("student", tab)}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )
        }
    }

    return (
        <DashboardSidebarContext.Provider
            value={{
                isSidebarOpen,
                setIsSidebarOpen,
                openSidebar: () => setIsSidebarOpen(true),
            }}
        >
            <div className="flex h-screen bg-background">
                {renderSidebar()}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                    {children}
                </div>
            </div>
        </DashboardSidebarContext.Provider>
    )
}
