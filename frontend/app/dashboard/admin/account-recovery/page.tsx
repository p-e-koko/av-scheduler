"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Search,
  Grid3X3,
  List,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RotateCcw,
  Trash2,
  UserX,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import ConfirmationDialog from "@/components/ConfirmationDialog"

import {
  userAPI,
  authAPI,
  getStoredUser,
  formatAPIError,
  hasAnyRole,
  type User,
  UsersListResponse
} from "@/lib/api"

export default function AccountRecovery() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [searchQuery, setSearchQuery] = useState("")
  const [trashedUsers, setTrashedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => void
    variant?: "default" | "destructive"
  }>({ isOpen: false, title: "", description: "", action: () => { }, variant: "default" })
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  // Check authentication and permissions
  useEffect(() => {
    const user = getStoredUser()

    if (!user) {
      router.push('/login')
      return
    }

    if (!hasAnyRole(['admin', 'supervisor', 'coordinator'])) {
      router.push('/login')
      return
    }

    setCurrentUser(user)
  }, [])

  // Fetch trashed users from backend
  const fetchTrashedUsers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      const response = await userAPI.getTrashedUsers({
        page: currentPage,
        per_page: 10,
        search: searchQuery || undefined
      })

      setTrashedUsers(response.data)
      setPagination(response.meta)
    } catch (err) {
      console.error('Failed to fetch trashed users:', err)
      setError(formatAPIError(err))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  // Initial load and search changes
  useEffect(() => {
    if (currentUser) {
      fetchTrashedUsers()
    }
  }, [currentUser, currentPage, searchQuery])

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1) // Reset to page 1 on search
      } else {
        fetchTrashedUsers()
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  const handleRestoreUser = (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Restore User Account",
      description: `Are you sure you want to restore ${userName}'s account? They will regain access to the system.`,
      action: () => performRestoreUser(userId),
      variant: "default"
    })
  }

  const performRestoreUser = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId))

    try {
      // Optimistically update UI
      setTrashedUsers(prev => prev.filter(user => user.id !== userId))

      await userAPI.restoreUser(userId)

      // If successful, the user is already removed from the list
      // Update pagination if needed
      if (pagination && pagination.total > 0) {
        setPagination((prev: any) => ({
          ...prev,
          total: prev.total - 1,
          to: Math.max(prev.to - 1, 0)
        }))
      }
    } catch (err) {
      // Revert optimistic update on error
      fetchTrashedUsers(false)
      setError(formatAPIError(err))
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handlePermanentDelete = (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Permanently Delete User",
      description: `Are you sure you want to permanently delete ${userName}? This action cannot be undone and all user data will be lost forever.`,
      action: () => performPermanentDelete(userId),
      variant: "destructive"
    })
  }

  const performPermanentDelete = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId))

    try {
      // Optimistically update UI
      setTrashedUsers(prev => prev.filter(user => user.id !== userId))

      await userAPI.forceDeleteUser(userId)

      // If successful, the user is already removed from the list
      // Update pagination if needed
      if (pagination && pagination.total > 0) {
        setPagination((prev: any) => ({
          ...prev,
          total: prev.total - 1,
          to: Math.max(prev.to - 1, 0)
        }))
      }
    } catch (err) {
      // Revert optimistic update on error
      fetchTrashedUsers(false)
      setError(formatAPIError(err))
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleBackToUserManagement = () => {
    router.push('/dashboard/admin')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <>
      {/* Header */}
      <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Account Recovery</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage deleted user accounts - restore or permanently delete</p>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border w-full md:w-auto">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className={`flex-1 md:flex-none ${viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`flex-1 md:flex-none ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deleted users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full md:w-64 bg-card/80 backdrop-blur-xl border-border focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading deleted users...</div>
          </div>
        )}

        {/* Content based on view mode */}
        {!loading && !error && (
          <>
            {viewMode === "card" ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trashedUsers.map((user) => (
                  <Card key={user.id} className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-red-100/50 dark:shadow-red-900/20 hover:shadow-xl hover:shadow-red-200/50 dark:hover:shadow-red-900/30 transition-all hover:scale-[1.01] h-32">
                    <CardContent className="p-4 h-full">
                      <div className="flex items-center space-x-4 h-full">
                        {/* Profile Picture - Left Side */}
                        <Avatar className="h-16 w-16 flex-shrink-0 opacity-75">
                          <AvatarImage src={user.profile_picture || user.profile_picture_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-lg">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* User Info - Right Side */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div>
                            <h3 className="font-semibold text-foreground text-sm truncate line-through">{user.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{user.student_id || 'No Student ID'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={user.email}>{user.email}</p>
                              {user.email_verified_at ? (
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              {user.role}
                            </Badge>
                            <Badge variant="destructive" className="text-xs px-2 py-0.5">
                              Deleted
                            </Badge>
                          </div>

                          {hasAnyRole(['admin']) && (
                            <div className="flex gap-1 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                onClick={() => handleRestoreUser(user.id, user.name)}
                                disabled={processingUsers.has(user.id)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                {processingUsers.has(user.id) ? 'Restoring...' : 'Restore'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={() => handlePermanentDelete(user.id, user.name)}
                                disabled={processingUsers.has(user.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {processingUsers.has(user.id) ? 'Deleting...' : 'Delete Forever'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Deleted At
                        </th>
                        {hasAnyRole(['admin']) && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trashedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors opacity-75">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profile_picture || user.profile_picture_url || ""} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-foreground line-through">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.student_id || 'No Student ID'}</div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  {user.email}
                                  {user.email_verified_at ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="hours" className="text-xs bg-secondary text-secondary-foreground">
                              {user.promised_hours_per_week || '0'}h/week
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {user.deleted_at ? new Date(user.deleted_at).toLocaleDateString() : 'Unknown'}
                          </td>
                          {hasAnyRole(['admin']) && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                  onClick={() => handleRestoreUser(user.id, user.name)}
                                  disabled={processingUsers.has(user.id)}
                                  title={processingUsers.has(user.id) ? 'Restoring...' : 'Restore user'}
                                >
                                  <RotateCcw className={`w-4 h-4 ${processingUsers.has(user.id) ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={() => handlePermanentDelete(user.id, user.name)}
                                  disabled={processingUsers.has(user.id)}
                                  title={processingUsers.has(user.id) ? 'Deleting...' : 'Delete permanently'}
                                >
                                  <Trash2 className={`w-4 h-4 ${processingUsers.has(user.id) ? 'animate-pulse' : ''}`} />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {pagination.from} to {pagination.to} of {pagination.total} deleted users
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {pagination.last_page}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={currentPage === pagination.last_page}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {trashedUsers.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No deleted users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'There are no deleted user accounts to recover.'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === "destructive" ? "Delete Forever" : "Confirm"}
      />
    </>
  )
}