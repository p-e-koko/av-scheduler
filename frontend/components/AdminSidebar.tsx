"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserX,
  FileText,
  Package,
  X,
  Loader2,
  LayoutDashboard,
  Key
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { authAPI, getStoredUser, type User } from "@/lib/api"
import { getAllowedDashboards } from "@/lib/role-routing"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

interface AdminSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

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

  const userRoles = currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role];

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
                <p className="text-xs text-primary-foreground/80">Admin Dashboard</p>
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
      <div className="flex-1 p-2 overflow-y-auto overscroll-contain">
        <nav className="space-y-1">
          <div
            onClick={() => {
              router.push('/dashboard/admin')
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${pathname === '/dashboard/admin'
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${pathname === '/dashboard/admin' ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">User Management</span>}
          </div>
          <div
            onClick={() => {
              router.push('/dashboard/admin/account-recovery')
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${pathname === '/dashboard/admin/account-recovery'
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${pathname === '/dashboard/admin/account-recovery' ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <UserX className="w-5 h-5 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Account Recovery</span>}
          </div>
          <div
            onClick={() => {
              router.push('/dashboard/admin/audit-logs')
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${pathname === '/dashboard/admin/audit-logs'
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${pathname === '/dashboard/admin/audit-logs' ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Audit Logs</span>}
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
          <div
            onClick={() => {
              router.push('/dashboard/keys')
              if (isMobile && onClose) onClose()
            }}
            className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} ${pathname.startsWith('/dashboard/keys')
              ? 'text-primary dark:text-white bg-primary/10 border-primary/20'
              : 'text-muted-foreground hover:bg-accent'
              } hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border ${pathname.startsWith('/dashboard/keys') ? 'border-primary/20' : 'border-transparent'
              }`}
          >
            <Key className={`w-5 h-5 flex-shrink-0 ${pathname.startsWith('/dashboard/keys') ? 'text-primary dark:text-white' : ''}`} />
            {(!sidebarCollapsed || isMobile) && <span className="font-medium">Keys</span>}
          </div>

          {/* Switch Dashboard Section */}
          {currentUser && getAllowedDashboards(userRoles).filter(path => !path.includes('/dashboard/admin') && !path.includes('/dashboard/inventory') && !path.includes('/dashboard/keys')).length > 0 && (
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
              {getAllowedDashboards(userRoles)
                .filter(path => !path.includes('/dashboard/admin') && !path.includes('/dashboard/inventory') && !path.includes('/dashboard/keys'))
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

      {/* Sidebar Footer - Current User */}
      <div className="p-4 border-t border-border">
        <div className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'}`}>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={currentUser.profile_picture || currentUser.profile_picture_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          {(!sidebarCollapsed || isMobile) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.email}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ModeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={handleLogoutClick}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
        {sidebarCollapsed && !isMobile && (
          <div className="mt-2 flex flex-col items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleLogoutClick}
              title="Logout"
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
