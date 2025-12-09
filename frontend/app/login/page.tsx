"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authAPI, formatAPIError, testConnection } from "@/lib/api"
import { getRoleBasedDashboardPath } from "@/lib/role-routing"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Test connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        setError("Cannot connect to backend server. Please check your connection.");
      }
    };
    
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await authAPI.login({ email, password })
      
      if (response.user) {
        // Check if email is verified
        if (!response.user.email_verified_at) {
          router.push('/auth/verify?reason=unverified');
          return;
        }

        // Redirect based on user role using role-based routing
        const redirectPath = getRoleBasedDashboardPath(response.user.role);
        router.push(redirectPath);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">AV Scheduler</h1>
          <p className="text-muted-foreground text-sm font-medium">Welcome back</p>
        </div>

        <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-gray-100/50 dark:shadow-none ring-1 ring-border/50">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              {/* Email Field */}
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
                  className="h-12 rounded-xl border-0 bg-muted/50 ring-1 ring-border focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-foreground font-medium text-sm tracking-wide">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12 rounded-xl border-0 bg-muted/50 ring-1 ring-border focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all duration-200 placeholder:text-muted-foreground text-foreground"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-accent/80 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary dark:text-blue-400 font-medium hover:text-primary-dark dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-white font-semibold rounded-xl bg-gradient-to-r from-primary via-primary-medium to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register Link */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground text-sm">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary dark:text-blue-400 font-semibold hover:text-primary-dark dark:hover:text-blue-300 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}