"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Plus,
  Edit,
  Trash2,
  Menu,
  X,
  UserX,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import AddUserModal from "@/components/AddUserModal"
import EditUserModal from "@/components/EditUserModal"
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
import { ModeToggle } from "@/components/mode-toggle"

function AdminDashboard() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => void
    variant?: "default" | "destructive"
  }>({ isOpen: false, title: "", description: "", action: () => {}, variant: "default" })
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

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await userAPI.getUsers({
        page: currentPage,
        per_page: 10,
        search: searchQuery || undefined,
        role: selectedRole || undefined
      })
      
      // Temporary debug: Log Derek's user data
      const derekUser = response.data.find(user => user.name.toLowerCase().includes('derek'))
      if (derekUser) {
        console.log('Derek found:', {
          name: derekUser.name,
          profile_picture: derekUser.profile_picture,
          profile_picture_url: derekUser.profile_picture_url
        })
      }
      
      setUsers(response.data)
      setPagination(response.meta)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  // Initial load and search/filter changes
  useEffect(() => {
    if (currentUser) {
      fetchUsers()
    }
  }, [currentUser, currentPage, searchQuery, selectedRole])

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1) // Reset to page 1 on search
      } else {
        fetchUsers()
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

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete User Account",
      description: `Are you sure you want to delete ${userName}? This will move the account to the recycle bin where it can be restored later.`,
      action: () => performDeleteUser(userId),
      variant: "destructive"
    })
  }

  const performDeleteUser = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId))
    
    try {
      // Optimistically update UI
      setUsers(prev => prev.filter(user => user.id !== userId))
      
      await userAPI.deleteUser(userId)
      
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
      fetchUsers()
      setError(formatAPIError(err))
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleAddUser = () => {
    setShowAddUserModal(true)
  }

  const handleUserAdded = () => {
    fetchUsers() // Refresh the user list
  }

  const handleUserUpdated = () => {
    fetchUsers() // Refresh the user list
    setSelectedUser(null)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditUserModal(true)
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <>
      {/* Header */}
      <header className="bg-card/70 backdrop-blur-xl border-b border-border px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage users, roles, and permissions</p>
          </div>
          {hasAnyRole(['admin']) && (
            <div className="flex space-x-2">
              <Button 
                className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground hover:shadow-lg transition-all"
                onClick={handleAddUser}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          )}
        </div>
      </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-xl rounded-lg p-1 border border-border">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-card/80 backdrop-blur-xl border-border focus:border-primary"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-card/80 backdrop-blur-xl text-foreground text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="coordinator">Coordinator</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading users...</div>
            </div>
          )}

          {/* Content based on view mode */}
          {!loading && !error && (
            <>
              {viewMode === "card" ? (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <Card 
                      key={user.id} 
                      className="bg-card/90 backdrop-blur-xl border-0 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.01] h-32"
                    >
                      <CardContent className="p-4 h-full">
                        <div className="flex items-center space-x-4 h-full">
                          {/* Profile Picture - Left Side */}
                          <Avatar className="h-16 w-16 flex-shrink-0">
                            <AvatarImage src={user.profile_picture_url || ""} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* User Info - Right Side */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div>
                              <h3 className="font-semibold text-foreground text-sm truncate">{user.name}</h3>
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
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {user.role}
                              </Badge>
                              <Badge variant="hours" className="text-xs px-2 py-0.5">
                                {user.promised_hours_per_week || '0'}h
                              </Badge>
                            </div>
                            
                            {hasAnyRole(['admin']) && (
                              <div className="flex gap-1 pt-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => handleEditUser(user)}
                                  disabled={processingUsers.has(user.id)}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  disabled={processingUsers.has(user.id)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  {processingUsers.has(user.id) ? 'Deleting...' : 'Delete'}
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
                <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          {hasAnyRole(['admin']) && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.map((user) => (
                          <tr 
                            key={user.id} 
                            className="group bg-card hover:bg-primary transition-colors duration-200"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 border-2 border-muted group-hover:border-primary-foreground/20">
                                  <AvatarImage src={user.profile_picture_url || ""} />
                                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-foreground group-hover:text-primary-foreground">{user.name}</div>
                                  <div className="text-sm text-muted-foreground group-hover:text-primary-foreground/80">{user.student_id || 'No Student ID'}</div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary-foreground/70">
                                    {user.email}
                                    {user.email_verified_at ? (
                                      <CheckCircle className="w-3 h-3 text-green-500 group-hover:text-green-300" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-red-500 group-hover:text-red-300" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                variant="outline" 
                                className="text-xs font-medium bg-background text-foreground border-border group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground group-hover:border-primary-foreground/30"
                              >
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground group-hover:text-primary-foreground/90">
                                {user.promised_hours_per_week || '0'}h/week
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground group-hover:text-primary-foreground/80">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            {hasAnyRole(['admin']) && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 group-hover:text-primary-foreground/80"
                                    onClick={() => handleEditUser(user)}
                                    disabled={processingUsers.has(user.id)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive group-hover:text-primary-foreground/80 group-hover:hover:text-white group-hover:hover:bg-red-500"
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    disabled={processingUsers.has(user.id)}
                                    title={processingUsers.has(user.id) ? 'Deleting...' : 'Delete user'}
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
                    Showing {pagination.from} to {pagination.to} of {pagination.total} results
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
              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || selectedRole ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first user.'}
                  </p>
                </div>
              )}
            </>
          )}
        </main>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={handleUserAdded}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false)
          setSelectedUser(null)
        }}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === "destructive" ? "Delete" : "Confirm"}
      />
    </>
  )
}

export default function ProtectedAdminDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </RoleProtectedRoute>
  )
}