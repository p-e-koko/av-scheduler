"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/AdminSidebar"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <RoleProtectedRoute allowedRoles={['admin', 'supervisor', 'coordinator']}>
      <div className="flex h-screen bg-background">
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="md:hidden p-2 border-b bg-card flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
             </Button>
             <span className="font-semibold">Menu</span>
          </div>
          {children}
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
