"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { testConnection, removeAuthToken, API_BASE_URL } from "@/lib/api"

export default function LoginPage() {
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
      // Clear any existing session/cookies on load to prevent conflicts
      removeAuthToken();
    };
    
    checkConnection();
  }, []);

  const handleMicrosoftLogin = () => {
    setIsLoading(true);
    // Clean base URL to ensure we point to the API route correctly
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    window.location.href = `${baseUrl}/login/microsoft/redirect`;
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
            <div className="p-4 rounded-xl bg-destructive/10">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}
