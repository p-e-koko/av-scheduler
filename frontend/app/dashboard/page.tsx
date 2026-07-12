"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/api'
import { getRoleBasedDashboardPath } from '@/lib/role-routing'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    // Redirect to role-based dashboard
    const dashboardPath = getRoleBasedDashboardPath(user.roles?.length ? user.roles : user.role)
    router.push(dashboardPath)
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}

