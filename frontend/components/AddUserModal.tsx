"use client"

import * as React from "react"
import { useState } from "react"
import { X, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userAPI, formatAPIError } from "@/lib/api"

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
}

interface AddUserFormData {
  name: string
  email: string
  password: string
  student_id: string
  username: string
  role: 'admin' | 'supervisor' | 'coordinator' | 'student'
  promised_hours_per_week: number
  profile_picture: File | null
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const [formData, setFormData] = useState<AddUserFormData>({
    name: "",
    email: "",
    password: "",
    student_id: "",
    username: "",
    role: "student",
    promised_hours_per_week: 0,
    profile_picture: null
  })
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'promised_hours_per_week' ? parseFloat(value) || 0 : 
                name === 'role' ? value as 'admin' | 'supervisor' | 'coordinator' | 'student' : 
                value
      }
      
      // If role changed to student and no promised hours set, ensure minimum 1 hour
      if (name === 'role' && value === 'student' && newData.promised_hours_per_week === 0) {
        newData.promised_hours_per_week = 1
      }
      
      return newData
    })
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
    setLoading(true)
    setError(null)

    // Client-side validation for students
    if (formData.role === 'student' && formData.promised_hours_per_week < 1) {
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
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('email', formData.email)
      submitData.append('password', formData.password)
      submitData.append('student_id', formData.student_id)
      submitData.append('username', formData.username)
      submitData.append('role', formData.role)
      submitData.append('promised_hours_per_week', formData.promised_hours_per_week.toString())
      
      if (formData.profile_picture) {
        submitData.append('profile_picture', formData.profile_picture)
      }
      
      await userAPI.createUser(submitData)
      
      // Success - close modal and refresh user list
      setFormData({
        name: "",
        email: "",
        password: "",
        student_id: "",
        username: "",
        role: "student",
        promised_hours_per_week: 0,
        profile_picture: null
      })
      setProfilePreview(null)
      onUserAdded()
      onClose()
    } catch (err) {
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        email: "",
        password: "",
        student_id: "",
        username: "",
        role: "student",
        promised_hours_per_week: 0,
        profile_picture: null
      })
      setProfilePreview(null)
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl shadow-primary/20 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
            <p className="text-sm text-gray-600 mt-1">Create a new user account</p>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Full Name *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder="Enter full name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder="Enter email address"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password *
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder="Enter password"
              minLength={8}
            />
          </div>

          {/* Student ID */}
          <div className="space-y-2">
            <Label htmlFor="student_id" className="text-sm font-medium text-gray-700">
              Student ID
            </Label>
            <Input
              id="student_id"
              name="student_id"
              type="text"
              value={formData.student_id}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder="Enter student ID (optional)"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder="Enter username (optional)"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-gray-700">
              Role *
            </Label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={handleInputChange}
              disabled={loading}
              className="w-full px-3 py-2 bg-white/80 backdrop-blur-xl border border-gray-300/30 rounded-md focus:border-primary focus:ring-1 focus:ring-primary text-sm text-gray-900"
            >
              <option value="student">Student</option>
              <option value="coordinator">Coordinator</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Promised Hours */}
          <div className="space-y-2">
            <Label htmlFor="promised_hours_per_week" className="text-sm font-medium text-gray-700">
              Promised Hours per Week {formData.role === 'student' && '*'}
            </Label>
            <Input
              id="promised_hours_per_week"
              name="promised_hours_per_week"
              type="number"
              min="0"
              max="20"
              step="1"
              value={formData.promised_hours_per_week}
              onChange={handleInputChange}
              disabled={loading}
              required={formData.role === 'student'}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary placeholder:text-gray-600 text-gray-900"
              placeholder={formData.role === 'student' ? "Required for students (1-20 hours)" : "0-20 hours"}
            />
            {formData.role === 'student' ? (
              <p className="text-xs text-gray-600">Students must promise 1-20 hours per week</p>
            ) : (
              <p className="text-xs text-gray-600">Maximum 20 hours per week</p>
            )}
          </div>

          {/* Profile Picture */}
          <div className="space-y-2">
            <Label htmlFor="profile_picture" className="text-sm font-medium text-gray-700">
              Profile Picture
            </Label>
            <Input
              id="profile_picture"
              name="profile_picture"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif"
              onChange={handleFileChange}
              disabled={loading}
              className="bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <p className="text-xs text-gray-600">Maximum file size: 500MB. Supported formats: JPEG, PNG, JPG, GIF</p>
            {profilePreview && (
              <div className="mt-2">
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                />
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
              className="flex-1 bg-white/80 backdrop-blur-xl border-gray-300/30 text-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-primary-medium text-white hover:shadow-lg transition-all"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}