import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Calendar, LogOut, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
import type { User } from "@/lib/api"

export interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
}

export interface DashboardNavigationProps {
  title: string
  subtitle: string
  user: User
  items: NavigationItem[]
  collapsed: boolean
  onToggleCollapse: () => void
  onLogout: () => void
  className?: string
  isMobile?: boolean
  gradient?: string
}

export function DashboardNavigation({
  title,
  subtitle,
  user,
  items,
  collapsed,
  onToggleCollapse,
  onLogout,
  className,
  isMobile = false,
  gradient = "from-primary to-primary-medium"
}: DashboardNavigationProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn(
      `${
        isMobile 
          ? collapsed ? 'h-16' : 'h-64' 
          : collapsed ? 'w-16' : 'w-64'
      } transition-all duration-300 flex-shrink-0`,
      className
    )}>
      <div className="bg-white/80 backdrop-blur-xl border-r border-gray-300/30 shadow-lg shadow-gray-100/50 h-full flex flex-col">
        {/* Header */}
        <div className={cn("bg-gradient-to-r text-white border-0 p-4", gradient)}>
          <div className="flex items-center justify-between">
            {(!collapsed || isMobile) ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-semibold text-lg">AV Scheduler</h1>
                  <p className="text-xs text-white/80">{subtitle}</p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleCollapse}
              className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
            >
              {collapsed ? (
                isMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                isMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        {!collapsed && (
          <>
            <div className="flex-1 p-2">
              <nav className="space-y-1">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    onClick={item.onClick}
                    className={cn(
                      `flex items-center ${isMobile ? 'justify-start' : 'space-x-3'} cursor-pointer transition-colors rounded-lg p-3`,
                      item.active 
                        ? 'text-primary bg-primary/10 border border-primary/20' 
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </nav>
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-gray-200/30">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={user.profile_picture_url || ""} />
                  <AvatarFallback className="bg-primary text-white font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user.email}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 flex-shrink-0"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Collapsed state user */}
        {collapsed && !isMobile && (
          <div className="p-4 border-t border-gray-200/30">
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profile_picture_url || ""} />
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export interface MobileBottomNavigationProps {
  items: NavigationItem[]
  className?: string
}

export function MobileBottomNavigation({
  items,
  className
}: MobileBottomNavigationProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-300/30 shadow-lg",
      className
    )}>
      <div className="flex items-center justify-around py-2">
        {items.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
              item.active 
                ? "text-primary bg-primary/10" 
                : "text-gray-600 hover:text-primary"
            )}
          >
            <div className="w-6 h-6">
              {item.icon}
            </div>
            <span className="text-xs font-medium truncate max-w-[60px]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className
}: PageHeaderProps) {
  return (
    <header className={cn(
      "bg-white/70 backdrop-blur-xl border-b border-gray-300/30 px-4 md:px-6 py-4 shadow-sm",
      className
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            {title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {subtitle}
          </p>
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}