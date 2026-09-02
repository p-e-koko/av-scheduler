"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    ClipboardList,
    Calendar,
    ChevronLeft,
    ChevronRight,
    LogOut,
    X,
    Loader2,
    LayoutDashboard,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { authAPI, getStoredUser, type User as UserType } from "@/lib/api"
import { getAllowedDashboards } from "@/lib/role-routing"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"

type AmbassadorTab = "assignments" | "availability" | "supervisor-schedule"

interface StudentAmbassadorSidebarProps {
    activeTab: AmbassadorTab
    onTabChange: (tab: AmbassadorTab) => void
    isOpen?: boolean
    onClose?: () => void
    user?: UserType | null
}

export function StudentAmbassadorSidebar({
    activeTab,
    onTabChange,
    isOpen,
    onClose,
    user,
}: StudentAmbassadorSidebarProps) {
    const router = useRouter()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [localUser, setLocalUser] = useState<UserType | null>(null)
    const [showLogoutDialog, setShowLogoutDialog] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const currentUser = user || localUser

    useEffect(() => {
        if (!user) {
            const storedUser = getStoredUser()
            if (storedUser) setLocalUser(storedUser)
        }
    }, [user])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden"
        else document.body.style.overflow = ""
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    const handleLogoutConfirm = async () => {
        setShowLogoutDialog(false)
        setIsLoggingOut(true)
        try {
            await authAPI.logout()
            router.push('/login')
        } catch {
            router.push('/login')
        }
    }

    const getInitials = (name: string) =>
        name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

    if (!currentUser) return null

    const userRoles = currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role]

    const navItems: { tab: AmbassadorTab; icon: React.ReactNode; label: string }[] = [
        { tab: "assignments", icon: <ClipboardList className="w-5 h-5" />, label: "My Assignments" },
        { tab: "availability", icon: <Calendar className="w-5 h-5" />, label: "Availability" },
        { tab: "supervisor-schedule", icon: <LayoutDashboard className="w-5 h-5" />, label: "Supervisor Schedule" },
    ]

    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="bg-card/80 backdrop-blur-xl border-r border-border shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white border-0 p-4">
                <div className="flex items-center justify-between">
                    {!sidebarCollapsed || isMobile ? (
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-lg">Marketing</h1>
                                <p className="text-xs text-white/80">Student Ambassador</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                    )}
                    {isMobile ? (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/20">
                            <X className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="h-8 w-8 text-white hover:bg-white/20"
                        >
                            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-2 overflow-y-auto overscroll-contain">
                <nav className="space-y-1">
                    {navItems.map(({ tab, icon, label }) => (
                        <div
                            key={tab}
                            onClick={() => { onTabChange(tab); if (isMobile && onClose) onClose() }}
                            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${activeTab === tab
                                    ? 'text-fuchsia-600 dark:text-white bg-fuchsia-50 dark:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-700'
                                    : 'text-muted-foreground hover:bg-accent'
                                } hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 rounded-lg p-2 cursor-pointer transition-colors border ${activeTab === tab ? 'border-fuchsia-200 dark:border-fuchsia-700' : 'border-transparent'
                                }`}
                        >
                            <span className={activeTab === tab ? 'text-fuchsia-600 dark:text-white' : ''}>{icon}</span>
                            {(!sidebarCollapsed || isMobile) && <span className="font-medium">{label}</span>}
                        </div>
                    ))}

                    {/* Switch Dashboard */}
                    {getAllowedDashboards(userRoles).filter(p => !p.includes('student-ambassador')).length > 0 && (
                        <>
                            <div className={`pt-4 pb-2 ${sidebarCollapsed && !isMobile ? 'text-center' : 'px-2'}`}>
                                {(!sidebarCollapsed || isMobile) ? (
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch View</p>
                                ) : (
                                    <div className="h-px w-8 mx-auto bg-border" />
                                )}
                            </div>
                            {getAllowedDashboards(userRoles)
                                .filter(p => !p.includes('student-ambassador'))
                                .map(path => (
                                    <div
                                        key={path}
                                        onClick={() => { router.push(path); if (isMobile && onClose) onClose() }}
                                        className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} text-muted-foreground hover:bg-accent rounded-lg p-2 cursor-pointer transition-colors border border-transparent`}
                                    >
                                        <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                                        {(!sidebarCollapsed || isMobile) && (
                                            <span className="font-medium capitalize">{path.split('/').pop()}</span>
                                        )}
                                    </div>
                                ))}
                        </>
                    )}
                </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card/50">
                <div className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'}`}>
                    <Avatar className="h-9 w-9 border-2 border-fuchsia-500/30">
                        <AvatarImage src={currentUser.profile_picture || currentUser.profile_picture_url || undefined} />
                        <AvatarFallback className="bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 font-medium">
                            {getInitials(currentUser.name)}
                        </AvatarFallback>
                    </Avatar>
                    {(!sidebarCollapsed || isMobile) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">{currentUser.name}</p>
                            <p className="text-xs text-muted-foreground truncate">Student Ambassador</p>
                        </div>
                    )}
                    {(!sidebarCollapsed || isMobile) && (
                        <div className="flex items-center space-x-1">
                            <ModeToggle />
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => setShowLogoutDialog(true)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
                {sidebarCollapsed && !isMobile && (
                    <div className="mt-4 flex flex-col items-center space-y-2">
                        <ModeToggle />
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setShowLogoutDialog(true)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <>
            <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0 h-screen sticky top-0 z-30`}>
                <SidebarContent />
            </aside>
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose}>
                    <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-lg animate-in slide-in-from-left" onClick={e => e.stopPropagation()}>
                        <SidebarContent isMobile={true} />
                    </div>
                </div>
            )}
            <ConfirmationDialog
                isOpen={showLogoutDialog}
                onClose={() => setShowLogoutDialog(false)}
                onConfirm={handleLogoutConfirm}
                title="Logout"
                description="Are you sure you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                variant="destructive"
            />
            <Dialog open={isLoggingOut} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-[425px] flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600 mb-4" />
                    <DialogTitle className="text-lg font-medium">Logging out...</DialogTitle>
                </DialogContent>
            </Dialog>
        </>
    )
}
