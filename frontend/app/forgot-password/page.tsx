"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authAPI, formatAPIError } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [resetToken, setResetToken] = useState("") // For demo purposes only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccessMessage("")
    setResetToken("")

    try {
      const response = await authAPI.forgotPassword(email)
      setSuccessMessage(response.message || "Password reset link sent to your email.")
      
      // In a real app, the token is sent via email. 
      // Since the backend returns it for testing (as seen in AuthController), we can display it or log it.
      // Ideally, we wouldn't show this in production UI, but for this project context it might be helpful.
      if (response.reset_token) {
          console.log("Reset Token:", response.reset_token);
          setResetToken(response.reset_token);
      }

    } catch (error) {
      setError(formatAPIError(error))
    } finally {
      setIsLoading(false)
    }
  }

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 16.464a2 2 0 00-.586 1.414V18h-2v-2a2 2 0 00-.586-1.414l-1.414-1.414A6 6 0 0115 7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Forgot Password</h1>
          <p className="text-muted-foreground text-sm font-medium">Reset your account password</p>
        </div>

        <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-gray-100/50 dark:shadow-none ring-1 ring-border/50">
          <CardContent className="p-8">
            {successMessage ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                    {successMessage}
                  </p>
                </div>
                
                {resetToken && (
                   <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-2">
                      Development Mode: Token Received
                    </p>
                    <code className="block bg-background/50 p-2 rounded text-xs break-all select-all">
                      {resetToken}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                        Copy this token and go to the reset page.
                    </p>
                    <Button asChild className="w-full mt-2" variant="outline" size="sm">
                        <Link href={`/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`}>
                            Go to Reset Password
                        </Link>
                    </Button>
                  </div>
                )}

                <Button asChild className="w-full" variant="outline">
                  <Link href="/login">
                    Back to Login
                  </Link>
                </Button>
              </div>
            ) : (
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
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-background/50"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
