"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Calendar,
    ClipboardList,
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

interface CustomerSidebarProps {
    activeTab: "book" | "my-bookings"
    onTabChange: (tab: "book" | "my-bookings") => void
    isOpen?: boolean
    onClose?: () => void
    user?: UserType | null
}

export function CustomerSidebar({ activeTab, onTabChange, isOpen, onClose, user }: CustomerSidebarProps) {
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
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
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

    const navItems = [
        {
            tab: "book" as const,
            label: "Book Media Service",
            icon: <Calendar className="w-5 h-5" />,
        },
        {
            tab: "my-bookings" as const,
            label: "My Bookings",
            icon: <ClipboardList className="w-5 h-5" />,
        },
    ]

    const userRoles = currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role];
    const hasOnlyCustomerRole = userRoles.length === 1 && userRoles[0].toLowerCase() === 'customer';

    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="bg-card/80 backdrop-blur-xl border-r border-border shadow-lg shadow-gray-100/50 dark:shadow-none h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground border-0 p-4">
                <div className="flex items-center justify-between">
                    {!sidebarCollapsed || isMobile ? (
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-lg">AV Scheduler</h1>
                                <p className="text-xs text-primary-foreground/80">Customer Portal</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                    )}

                    {isMobile ? (
                        <Button variant="ghost" size="icon" onClick={onClose}
                            className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0">
                            <X className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0">
                            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-2 overflow-y-auto overscroll-contain">
                <nav className="space-y-1">
                    {navItems.map(({ tab, label, icon }) => (
                        <div
                            key={tab}
                            onClick={() => {
                                onTabChange(tab)
                                if (isMobile && onClose) onClose()
                            }}
                            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'}
                ${activeTab === tab
                                    ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
                                    : 'text-muted-foreground hover:bg-accent'
                                }
                hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border
                ${activeTab === tab ? 'border-primary/20' : 'border-transparent'}`}
                            title={sidebarCollapsed && !isMobile ? label : undefined}
                        >
                            {React.cloneElement(icon, {
                                className: `w-5 h-5 ${activeTab === tab ? 'text-primary dark:text-white' : ''}`,
                            })}
                            {(!sidebarCollapsed || isMobile) && <span className="font-medium">{label}</span>}
                        </div>
                    ))}
                </nav>

                    {/* Switch View Section */}
                    {currentUser && !hasOnlyCustomerRole && getAllowedDashboards(currentUser.roles || []).filter(path => !path.includes('/dashboard/customer')).length > 0 && (
                        <>
                            <div className={`pt-4 pb-2 ${sidebarCollapsed && !isMobile ? 'text-center' : 'px-2'}`}>
                                {(!sidebarCollapsed || isMobile) ? (
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Switch View
                                    </p>
                                ) : (
                                    <div className="h-px w-8 mx-auto bg-border" />
                                )}
                            </div>
                            {getAllowedDashboards(currentUser.roles || [])
                                .filter(path => !path.includes('/dashboard/customer'))
                                .map(path => {
                                    const label = path.split('/').pop();
                                    return (
                                        <div
                                            key={path}
                                            onClick={() => {
                                                router.push(path);
                                                if (isMobile && onClose) onClose();
                                            }}
                                            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} text-muted-foreground hover:bg-accent hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border border-transparent`}
                                            title={sidebarCollapsed && !isMobile ? `Switch to ${label}` : undefined}
                                        >
                                            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                                            {(!sidebarCollapsed || isMobile) && (
                                                <span className="font-medium capitalize">{label}</span>
                                            )}
                                        </div>
                                    );
                                })}
                        </>
                    )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card/50">
                <div className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'}`}>
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                        <AvatarImage src={currentUser.profile_picture || currentUser.profile_picture_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(currentUser.name)}
                        </AvatarFallback>
                    </Avatar>
                    {(!sidebarCollapsed || isMobile) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">{currentUser.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">Customer</p>
                        </div>
                    )}
                    {(!sidebarCollapsed || isMobile) && (
                        <div className="flex items-center space-x-1">
                            <ModeToggle />
                            <Button variant="ghost" size="icon"
                                onClick={() => setShowLogoutDialog(true)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
                {sidebarCollapsed && !isMobile && (
                    <div className="mt-4 flex flex-col items-center space-y-2">
                        <ModeToggle />
                        <Button variant="ghost" size="icon"
                            onClick={() => setShowLogoutDialog(true)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop */}
            <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0 h-screen sticky top-0 z-30`}>
                <SidebarContent />
            </aside>

            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose}>
                    <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-lg animate-in slide-in-from-left"
                        onClick={e => e.stopPropagation()}>
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <DialogTitle className="text-lg font-medium">Logging out...</DialogTitle>
                </DialogContent>
            </Dialog>
        </>
    )
}
