"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authAPI, formatAPIError, testConnection } from "@/lib/api"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    student_id: "",
    username: "",
    promised_hours_per_week: 0,
    profile_picture: null as File | null
  })
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Test connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        setError("Cannot connect to backend server. Please ensure Laravel is running on http://localhost:8000");
      }
    };
    
    checkConnection();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, profile_picture: file }))
    
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setProfilePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setProfilePreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Basic validation
    if (formData.password !== formData.password_confirmation) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      setIsLoading(false)
      return
    }

    // Validate promised hours for students (default role)
    if (formData.promised_hours_per_week < 1) {
      setError("Students must promise at least 1 hour per week")
      setIsLoading(false)
      return
    }

    if (formData.promised_hours_per_week > 20) {
      setError("Promised hours cannot exceed 20 hours per week")
      setIsLoading(false)
      return
    }

    try {
      // Use FormData for file upload
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('email', formData.email)
      submitData.append('password', formData.password)
      submitData.append('password_confirmation', formData.password_confirmation)
      submitData.append('student_id', formData.student_id)
      submitData.append('username', formData.username)
      submitData.append('promised_hours_per_week', formData.promised_hours_per_week.toString())
      
      if (formData.profile_picture) {
        submitData.append('profile_picture', formData.profile_picture)
      }
      
      const response = await authAPI.register(submitData)
      
      if (response.access_token && response.user) {
        // Redirect based on user role
        const redirectPath = response.user.role === 'admin' 
          ? '/dashboard/admin' 
          : '/dashboard'
        
        router.push(redirectPath)
      }
    } catch (error) {
      setError(formatAPIError(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* Modern App Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-medium mb-6 shadow-lg shadow-primary/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">AV Scheduler</h1>
          <p className="text-gray-500 text-sm font-medium">Create your account</p>
        </div>

        <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-gray-100/50 ring-1 ring-gray-200/50">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-3">
                <Label htmlFor="name" className="text-gray-800 font-medium text-sm tracking-wide">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-800 font-medium text-sm tracking-wide">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Username (Optional) */}
              <div className="space-y-3">
                <Label htmlFor="username" className="text-gray-800 font-medium text-sm tracking-wide">
                  Username <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                  disabled={isLoading}
                />
              </div>

              {/* Student ID (Optional) */}
              <div className="space-y-3">
                <Label htmlFor="student_id" className="text-gray-800 font-medium text-sm tracking-wide">
                  Student ID <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="student_id"
                  type="text"
                  placeholder="Enter your student ID"
                  value={formData.student_id}
                  onChange={(e) => handleInputChange('student_id', e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                  disabled={isLoading}
                />
              </div>

              {/* Promised Hours per Week */}
              <div className="space-y-3">
                <Label htmlFor="promised_hours_per_week" className="text-gray-800 font-medium text-sm tracking-wide">
                  Promised Hours per Week <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="promised_hours_per_week"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  placeholder="Enter hours (1-20)"
                  value={formData.promised_hours_per_week || ""}
                  onChange={(e) => handleInputChange('promised_hours_per_week', e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">As a student, you must promise 1-20 hours per week</p>
              </div>

              {/* Profile Picture (Optional) */}
              <div className="space-y-3">
                <Label htmlFor="profile_picture" className="text-gray-800 font-medium text-sm tracking-wide">
                  Profile Picture <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif"
                  onChange={handleFileChange}
                  className="h-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">Maximum file size: 500MB. Supported: JPEG, PNG, JPG, GIF</p>
                {profilePreview && (
                  <div className="mt-3">
                    <img
                      src={profilePreview}
                      alt="Profile preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-800 font-medium text-sm tracking-wide">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="h-12 pr-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-gray-100/80 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password_confirmation" className="text-gray-800 font-medium text-sm tracking-wide">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.password_confirmation}
                    onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                    className="h-12 pr-12 rounded-xl border-0 bg-gray-50/80 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-gray-100/80 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                </div>
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
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:text-primary-dark transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}