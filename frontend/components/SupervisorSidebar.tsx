"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Loader2,
  Package,
  LayoutDashboard
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

interface SupervisorSidebarProps {
  activeTab: "dashboard" | "student-schedules" | "assignment-schedules" | "students"
  onTabChange: (tab: "dashboard" | "student-schedules" | "assignment-schedules" | "students") => void
  isOpen?: boolean
  onClose?: () => void
}

export function SupervisorSidebar({ activeTab, onTabChange, isOpen, onClose }: SupervisorSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  const handleLogoutConfirm = async () => {
    setShowLogoutDialog(false)
    setIsLoggingOut(true)
    try {
      await authAPI.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!currentUser) return null

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="bg-card/80 backdrop-blur-xl border-r border-border shadow-lg shadow-gray-100/50 dark:shadow-none h-full flex flex-col">
      {/* Sidebar Header - App Branding */}
      <div className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground border-0 p-4">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed || isMobile ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">AV Scheduler</h1>
                <p className="text-xs text-primary-foreground/80">Supervisor Dashboard</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          )}

          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="flex-1 p-2">
        <nav className="space-y-1">
          <div
            onClick={() => {
              onTabChange("dashboard")
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${activeTab === "dashboard"
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${activeTab === "dashboard" ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === "dashboard" ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Dashboard</span>}
          </div>

          <div
            onClick={() => {
              onTabChange("students")
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${activeTab === "students"
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${activeTab === "students" ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Users className={`w-5 h-5 ${activeTab === "students" ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Students</span>}
          </div>

          <div
            onClick={() => {
              onTabChange("student-schedules")
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${activeTab === "student-schedules"
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${activeTab === "student-schedules" ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Users className={`w-5 h-5 ${activeTab === "student-schedules" ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Student Schedules</span>}
          </div>

          <div
            onClick={() => {
              onTabChange("assignment-schedules")
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${activeTab === "assignment-schedules"
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${activeTab === "assignment-schedules" ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === "assignment-schedules" ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Assignment Schedules</span>}
          </div>
          <div
            onClick={() => {
              router.push('/dashboard/inventory')
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${pathname.startsWith('/dashboard/inventory')
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${pathname.startsWith('/dashboard/inventory') ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Package className={`w-5 h-5 flex-shrink-0 ${pathname.startsWith('/dashboard/inventory') ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Inventory</span>}
          </div>

          {/* Switch Dashboard Section */}
          {currentUser && getAllowedDashboards(currentUser.roles || []).filter(path => !path.includes('/dashboard/supervisor')).length > 0 && (
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
                .filter(path => !path.includes('/dashboard/supervisor'))
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
        </nav>
      </div>

      {/* Sidebar Footer - User Profile */}
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
              <p className="text-xs text-muted-foreground truncate capitalize">{currentUser.role}</p>
            </div>
          )}
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex items-center space-x-1">
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogoutClick}
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
              variant="ghost"
              size="icon"
              onClick={handleLogoutClick}
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
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0 h-screen sticky top-0 z-30`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
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
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <DialogTitle className="text-lg font-medium">Logging out...</DialogTitle>
        </DialogContent>
      </Dialog>
    </>
  )
}