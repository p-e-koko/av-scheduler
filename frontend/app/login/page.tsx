"use client"

import * as React from "react"
import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { authAPI, testConnection, removeAuthToken, API_BASE_URL, formatAPIError } from "@/lib/api"
import { getRoleBasedDashboardPath } from "@/lib/role-routing"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from "next/navigation"

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showLocalLogin, setShowLocalLogin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Test connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        setError("Cannot connect to backend server. Please check your connection.");
      }
      // Clear any existing session/cookies on load to prevent conflicts
      removeAuthToken();
    };

    checkConnection();
  }, []);

  // Read error from query string (e.g. pending approval from Microsoft login)
  React.useEffect(() => {
    const errorFromQuery = searchParams.get("error");
    if (errorFromQuery) {
      setError(errorFromQuery);
    } else if (searchParams.get("expired") === "true") {
      setError("Your session has expired. Please log in again.");
    } else if (searchParams.get("changed") === "true") {
      setError("Your account details have changed. Please log in again.");
    }
  }, [searchParams]);

  const handleMicrosoftLogin = () => {
    setIsLoading(true);
    // Clean base URL to ensure we point to the API route correctly
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    window.location.href = `${baseUrl}/login/microsoft/redirect`;
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLocalLoading(true);
    setError("");

    try {
      const response = await authAPI.login({ email, password });

      // Redirect based on the user's full role set
      const user = response.user;
      if (user) {
        const dashboardPath = getRoleBasedDashboardPath(user.roles?.length ? user.roles : user.role);
        router.push(dashboardPath);
      }
    } catch (err) {
      setError(formatAPIError(err));
    } finally {
      setLocalLoading(false);
    }
  };

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

        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm text-destructive font-medium text-center">{error}</p>
            </div>
          )}

          {!showLocalLogin ? (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full h-12 text-white font-semibold rounded-xl bg-gradient-to-r from-primary via-primary-medium to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Redirecting...</span>
                  </div>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="microsoft" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"></path></svg>
                    Sign in with Microsoft
                  </>
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-border hover:bg-muted/50 transition-all font-medium"
                onClick={() => setShowLocalLogin(true)}
              >
                Use Email & Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLocalLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <Label htmlFor="email">Email or ID</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl bg-muted/50 border-border focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl bg-muted/50 border-border focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-white font-semibold rounded-xl bg-gradient-to-r from-primary to-primary-medium shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                disabled={localLoading}
              >
                {localLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-muted-foreground hover:text-foreground text-sm"
                onClick={() => setShowLocalLogin(false)}
              >
                Back to Microsoft Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}




