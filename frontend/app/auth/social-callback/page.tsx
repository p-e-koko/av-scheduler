"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setAuthToken } from "@/lib/api"

export default function SocialCallback() {
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
      // Save token (which sets cookies/headers for future requests)
      setAuthToken(token)
      // Redirect to dashboard
      window.location.href = "/dashboard"
    } else {
      router.push("/login?error=Authentication failed")
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Completing secure sign in...</p>
      </div>
    </div>
  )
}
