"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RedirectToLogin() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting to login...</p>
    </div>
  )
}