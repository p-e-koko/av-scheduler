"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getStoredUser, hasAnyRole } from '@/lib/api'
import { getRoleBasedDashboardPath } from '@/lib/role-routing'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getStoredUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const handleNavigateToDashboard = () => {
    if (user) {
      const dashboardPath = getRoleBasedDashboardPath(user.role)
      router.push(dashboardPath)
    } else {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <main className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
        {/* App Logo and Branding */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-primary-medium flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-900">AV Scheduler</h1>
            <p className="text-sm text-gray-600">Audio Visual Management System</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          {user ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome back, {user.name}!
              </h2>
              <p className="text-gray-600">
                You are logged in as <span className="font-medium">{user.role}</span>
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to AV Scheduler
              </h2>
              <p className="text-gray-600">
                Please sign in to access your dashboard
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 w-full">
          {user ? (
            <>
              <Button 
                onClick={handleNavigateToDashboard}
                className="w-full bg-gradient-to-r from-primary to-primary-medium text-white hover:shadow-lg transition-all"
              >
                Go to My Dashboard
              </Button>
              
              <Link href="/dashboard">
                <Button variant="outline" className="w-full bg-white/80 backdrop-blur-xl border-gray-300/30">
                  Quick Access
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-primary to-primary-medium text-white hover:shadow-lg transition-all">
                  Sign In
                </Button>
              </Link>
              
              <Link href="/register">
                <Button variant="outline" className="w-full bg-white/80 backdrop-blur-xl border-gray-300/30">
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Quick Access for Testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800 font-medium mb-2">Development Mode</p>
            <div className="flex space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs">
                  Login Page
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="ghost" size="sm" className="text-xs">
                  Register Page
                </Button>
              </Link>
              <Link href="/dashboard/admin">
                <Button variant="ghost" size="sm" className="text-xs">
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
