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
  UserX
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
  const fetchTrashedUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await userAPI.getTrashedUsers({
        page: currentPage,
        per_page: 12,
        search: searchQuery || undefined
      })
      
      setTrashedUsers(response.data)
      setPagination(response.meta)
    } catch (err) {
      console.error('Failed to fetch trashed users:', err)
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
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

  const handleRestoreUser = async (userId: number) => {
    if (!confirm('Are you sure you want to restore this user account?')) return
    
    try {
      await userAPI.restoreUser(userId)
      fetchTrashedUsers() // Refresh the list
    } catch (err) {
      alert(formatAPIError(err))
    }
  }

  const handlePermanentDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone!')) return
    
    try {
      await userAPI.forceDeleteUser(userId)
      fetchTrashedUsers() // Refresh the list
    } catch (err) {
      alert(formatAPIError(err))
    }
  }

  const handleBackToUserManagement = () => {
    router.push('/dashboard/admin')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white/80 backdrop-blur-xl border-r border-gray-300/30 shadow-lg shadow-gray-100/50 h-full flex flex-col">
          {/* Sidebar Header - App Branding */}
          <div className="bg-gradient-to-r from-primary to-primary-medium text-white border-0 p-4">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-lg">AV Scheduler</h1>
                    <p className="text-xs text-white/80">Admin Dashboard</p>
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 p-2">
            <nav className="space-y-1">
              <div 
                onClick={handleBackToUserManagement}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-gray-600 hover:bg-gray-100 rounded-lg p-2 cursor-pointer transition-colors`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>User Management</span>}
              </div>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-primary bg-primary/10 hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border border-primary/20`}>
                <UserX className="w-5 h-5 flex-shrink-0 text-primary" />
                {!sidebarCollapsed && <span className="font-medium text-primary">Account Recovery</span>}
              </div>
            </nav>
          </div>

          {/* Sidebar Footer - Current User */}
          <div className="p-4 border-t border-gray-200/30">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={currentUser.profile_picture_url || ""} />
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {sidebarCollapsed && (
              <div className="mt-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-gray-300/30 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Account Recovery</h1>
              <p className="text-sm text-gray-600 mt-1">Manage deleted user accounts - restore or permanently delete</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-gray-300/30">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={viewMode === "card" ? "bg-primary text-white" : "text-gray-700 hover:text-gray-900"}
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-primary text-white" : "text-gray-700 hover:text-gray-900"}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search deleted users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary"
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
                    <Card key={user.id} className="bg-white/90 backdrop-blur-xl border-0 shadow-lg shadow-red-100/50 hover:shadow-xl hover:shadow-red-200/50 transition-all hover:scale-[1.01] h-32">
                      <CardContent className="p-4 h-full">
                        <div className="flex items-center space-x-4 h-full">
                          {/* Profile Picture - Left Side */}
                          <Avatar className="h-16 w-16 flex-shrink-0 opacity-75">
                            <AvatarImage src={user.profile_picture_url || ""} />
                            <AvatarFallback className="bg-gray-400 text-white font-semibold text-lg">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* User Info - Right Side */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div>
                              <h3 className="font-semibold text-gray-700 text-sm truncate line-through">{user.name}</h3>
                              <p className="text-xs text-gray-500 truncate">{user.student_id || 'No Student ID'}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-red-100 text-red-700">
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
                                  className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleRestoreUser(user.id)}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Restore
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handlePermanentDelete(user.id)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete Forever
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
                <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-300/30 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Deleted At
                          </th>
                          {hasAnyRole(['admin']) && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/50">
                        {trashedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50/30 transition-colors opacity-75">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.profile_picture_url || ""} />
                                  <AvatarFallback className="bg-gray-400 text-white font-semibold">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-700 line-through">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.student_id || 'No Student ID'}</div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="hours" className="text-xs bg-gray-100 text-gray-600">
                                {user.promised_hours_per_week || '0'}h/week
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {user.deleted_at ? new Date(user.deleted_at).toLocaleDateString() : 'Unknown'}
                            </td>
                            {hasAnyRole(['admin']) && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleRestoreUser(user.id)}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handlePermanentDelete(user.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {pagination.from} to {pagination.to} of {pagination.total} deleted users
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="bg-white/80 backdrop-blur-xl border-gray-300/30"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {pagination.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pagination.last_page}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="bg-white/80 backdrop-blur-xl border-gray-300/30"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {trashedUsers.length === 0 && (
                <div className="text-center py-12">
                  <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No deleted users found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'There are no deleted user accounts to recover.'}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}