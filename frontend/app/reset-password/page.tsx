"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authAPI, formatAPIError } from "@/lib/api"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get("email")
    const tokenParam = searchParams.get("token")
    if (emailParam) setEmail(emailParam)
    if (tokenParam) setToken(tokenParam)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password !== passwordConfirmation) {
        setError("Passwords do not match")
        setIsLoading(false)
        return
    }

    try {
      await authAPI.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation
      })
      setSuccess(true)
    } catch (error) {
      setError(formatAPIError(error))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                Password has been reset successfully!
                </p>
            </div>
            <Button asChild className="w-full" size="lg">
                <Link href="/login">
                Proceed to Login
                </Link>
            </Button>
        </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <Label htmlFor="email" className="text-foreground font-medium text-sm tracking-wide">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 bg-background/50"
          readOnly={!!searchParams.get("email")}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="token" className="text-foreground font-medium text-sm tracking-wide">
          Reset Token
        </Label>
        <Input
          id="token"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="h-11 bg-background/50"
          placeholder="Paste your reset token here"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="password" className="text-foreground font-medium text-sm tracking-wide">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 bg-background/50 pr-10"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="password_confirmation" className="text-foreground font-medium text-sm tracking-wide">
          Confirm New Password
        </Label>
        <Input
          id="password_confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
          className="h-11 bg-background/50"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full h-11 font-medium text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        disabled={isLoading}
      >
        {isLoading ? "Resetting Password..." : "Reset Password"}
      </Button>

      <div className="text-center">
        <Link 
          href="/login" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm">
        {/* Modern App Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-medium mb-6 shadow-lg shadow-primary/20">
            <svg className="w-7 h-7 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Reset Password</h1>
          <p className="text-muted-foreground text-sm font-medium">Create a new password</p>
        </div>

        <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-gray-100/50 dark:shadow-none ring-1 ring-border/50">
          <CardContent className="p-8">
            <Suspense fallback={<div>Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
