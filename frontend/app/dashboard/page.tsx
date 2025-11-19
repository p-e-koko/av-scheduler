// Simple navigation helper
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, hasAnyRole } from '@/lib/api'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    // Redirect admin users to admin dashboard
    if (hasAnyRole(['admin', 'supervisor', 'coordinator'])) {
      router.push('/dashboard/admin')
    } else {
      // Regular users can go to a student dashboard (to be created later)
      router.push('/login') // For now, redirect to login
    }
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  )
}