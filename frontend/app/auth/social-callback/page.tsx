"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setAuthToken, authAPI } from "@/lib/api"
import { getRoleBasedDashboardPath } from "@/lib/role-routing"

function SocialCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const error = searchParams.get("error")

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`)
      return
    }

    if (token) {
      const handleLogin = async () => {
        try {
          // 1. Save Token
          setAuthToken(token)

          // 2. Fetch User Profile to get Role
          // We wait a tiny bit to ensure localStorage is set
          await new Promise(resolve => setTimeout(resolve, 100));
          const user = await authAPI.getCurrentUser();
          
          if (user) {
            // 3. Redirect based on Role
            const redirectPath = getRoleBasedDashboardPath(user.role || 'student');
            window.location.href = redirectPath;
          } else {
             // Fallback
             window.location.href = "/dashboard/student";
          }
        } catch (err) {
          console.error("Failed to fetch user role:", err);
          // If fetching user fails but we have token, default to student or main dashboard
          window.location.href = "/dashboard/student"; 
        }
      };

      handleLogin();
    } else {
      router.push("/login?error=Authentication failed")
    }
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Completing secure sign in...</p>
    </div>
  )
}

export default function SocialCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />}>
        <SocialCallbackContent />
      </Suspense>
    </div>
  )
}
