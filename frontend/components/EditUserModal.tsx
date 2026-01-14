"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { X, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userAPI, formatAPIError, type User } from "@/lib/api"

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserUpdated: () => void
  user: User | null
}

interface EditUserFormData {
  name: string
  email: string
  password: string
  student_id: string
  username: string
  roles: string[]
  promised_hours_per_week: number
  profile_picture: File | null
}

export default function EditUserModal({ isOpen, onClose, onUserUpdated, user }: EditUserModalProps) {
  const [formData, setFormData] = useState<EditUserFormData>({
    name: "",
    email: "",
    password: "",
    student_id: "",
    username: "",
    roles: ["student"],
    promised_hours_per_week: 0,
    profile_picture: null
  })
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update form data when user prop changes
  useEffect(() => {
    if (user && isOpen) {
      let initialRoles = user.roles && user.roles.length > 0 ? user.roles : [];
      if (initialRoles.length === 0 && user.role) {
        initialRoles = [user.role];
      }
      
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "", // Always empty for security
        student_id: user.student_id || "",
        username: user.username || "",
        roles: initialRoles,
        promised_hours_per_week: parseFloat(user.promised_hours_per_week || "0"),
        profile_picture: null
      })
      // Set existing profile picture preview
      setProfilePreview(user.profile_picture || user.profile_picture_url || null)
    }
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'promised_hours_per_week' ? parseFloat(value) || 0 : value
    }))
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => {
      let newRoles = [...prev.roles];
      if (checked) {
        if (!newRoles.includes(role)) newRoles.push(role);
      } else {
        newRoles = newRoles.filter(r => r !== role);
      }
      
      const newData = { ...prev, roles: newRoles };

      // If student role added and no promised hours, default to 1
      if (checked && role === 'student' && newData.promised_hours_per_week === 0) {
        newData.promised_hours_per_week = 1;
      }
      return newData;
    });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, profile_picture: file }))

    if (file) {
      const reader = new FileReader()
      reader.onload = () => setProfilePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    if (formData.roles.length === 0) {
      setError('At least one role must be selected.')
      setLoading(false)
      return
    }

    // Client-side validation for students
    if (formData.roles.includes('student') && formData.promised_hours_per_week < 1) {
      setError('Students must promise at least 1 hour per week.')
      setLoading(false)
      return
    }

    if (formData.promised_hours_per_week > 20) {
      setError('Promised hours cannot exceed 20 hours per week.')
      setLoading(false)
      return
    }

    try {
      // Use FormData for file upload
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('email', formData.email)
      submitData.append('student_id', formData.student_id)
      submitData.append('username', formData.username)
      
      // Append roles array
      formData.roles.forEach((role, index) => {
        submitData.append(`roles[${index}]`, role)
      })

      submitData.append('promised_hours_per_week', formData.promised_hours_per_week.toString())

      // Only include password if it's not empty
      if (formData.password.trim()) {
        submitData.append('password', formData.password)
      }

      if (formData.profile_picture) {
        submitData.append('profile_picture', formData.profile_picture)
      }

      // Add _method: PATCH for file upload update
      submitData.append('_method', 'PATCH')

      await userAPI.updateUser(user.id, submitData)

      onUserUpdated()
      onClose()
    } catch (err) {
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setProfilePreview(null)
      onClose()
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card/95 backdrop-blur-xl rounded-lg shadow-2xl shadow-primary/10 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Edit User</h2>
            <p className="text-sm text-muted-foreground mt-1">Update user account details</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={loading}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">
              Full Name *
            </Label>
            <Input
              id="edit-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder="Enter full name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium text-foreground">
              Email Address *
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder="Enter email address"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-password" className="text-sm font-medium text-foreground">
              Password <span className="text-muted-foreground font-normal">(leave empty to keep current)</span>
            </Label>
            <Input
              id="edit-password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder="Enter new password"
              minLength={8}
            />
          </div>

          {/* Student ID */}
          <div className="space-y-2">
            <Label htmlFor="edit-student_id" className="text-sm font-medium text-foreground">
              Student ID
            </Label>
            <Input
              id="edit-student_id"
              name="student_id"
              type="text"
              value={formData.student_id}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder="Enter student ID (optional)"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="edit-username" className="text-sm font-medium text-foreground">
              Username
            </Label>
            <Input
              id="edit-username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder="Enter username (optional)"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Roles *
            </Label>
            <div className="flex flex-wrap gap-4 p-3 bg-muted/50 backdrop-blur-xl border border-input rounded-md">
              {['student', 'coordinator', 'supervisor', 'admin'].map((roleOption) => (
                <label key={roleOption} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(roleOption)}
                    onChange={(e) => handleRoleChange(roleOption, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm capitalize">{roleOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Promised Hours */}
          <div className="space-y-2">
            <Label htmlFor="edit-promised_hours_per_week" className="text-sm font-medium text-foreground">
              Promised Hours per Week {formData.roles.includes('student') && '*'}
            </Label>
            <Input
              id="edit-promised_hours_per_week"
              name="promised_hours_per_week"
              type="number"
              min="0"
              max="20"
              step="1"
              value={formData.promised_hours_per_week}
              onChange={handleInputChange}
              disabled={loading}
              required={formData.roles.includes('student')}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary placeholder:text-muted-foreground text-foreground"
              placeholder={formData.roles.includes('student') ? "Required for students (1-20 hours)" : "0-20 hours"}
            />
            {formData.roles.includes('student') ? (
              <p className="text-xs text-muted-foreground">Students must promise 1-20 hours per week</p>
            ) : (
              <p className="text-xs text-muted-foreground">Maximum 20 hours per week</p>
            )}
          </div>

          {/* Profile Picture */}
          <div className="space-y-2">
            <Label htmlFor="edit-profile_picture" className="text-sm font-medium text-foreground">
              Profile Picture
            </Label>
            <Input
              id="edit-profile_picture"
              name="profile_picture"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif"
              onChange={handleFileChange}
              disabled={loading}
              className="bg-muted/50 backdrop-blur-xl border-input focus:border-primary text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary dark:file:text-white hover:file:bg-primary/20 h-16 pt-3"
            />
            <p className="text-xs text-muted-foreground">Maximum file size: 500MB. Supported formats: JPEG, PNG, JPG, GIF</p>
            {profilePreview && (
              <div className="mt-2">
                <Avatar className="h-32 w-32 border-2 border-border">
                  <AvatarImage src={profilePreview} alt="Profile preview" className="object-cover" />
                  <AvatarFallback className="text-4xl bg-muted">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-muted/50 backdrop-blur-xl border-input text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground hover:shadow-lg transition-all"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Updating...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update User
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}