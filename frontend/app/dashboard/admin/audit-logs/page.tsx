"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Search, 
  Filter, 
  List, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserX,
  FileText,
  Clock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { 
  auditLogAPI, 
  getStoredUser,
  formatAPIError,
  hasAnyRole,
  type User,
  type AuditLog
} from "@/lib/api"

export default function AuditLogsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("all")

  // Check authentication and permissions
  useEffect(() => {
    const user = getStoredUser()
    if (!user) {
      router.push('/login')
      return
    }
    
    if (!hasAnyRole(['admin'])) {
      router.push('/login')
      return
    }
    
    setCurrentUser(user)
  }, [])

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await auditLogAPI.getLogs({
        page: currentPage,
        search: searchQuery || undefined,
        role: selectedRole !== "all" ? selectedRole : undefined
      })
      
      setLogs(response.data)
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        from: response.from,
        to: response.to
      })
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError(formatAPIError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchLogs()
    }
  }, [currentUser, currentPage, selectedRole])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser) {
        setCurrentPage(1)
        fetchLogs()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLogout = () => {
    // Implement logout logic here or redirect
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white/80 backdrop-blur-xl border-r border-gray-300/30 shadow-lg shadow-gray-100/50 h-full flex flex-col">
          {/* Sidebar Header */}
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
                onClick={() => router.push('/dashboard/admin')}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-gray-600 hover:bg-gray-100 rounded-lg p-2 cursor-pointer transition-colors`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>User Management</span>}
              </div>
              <div 
                onClick={() => router.push('/dashboard/admin/account-recovery')}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-gray-600 hover:bg-gray-100 rounded-lg p-2 cursor-pointer transition-colors`}
              >
                <UserX className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Account Recovery</span>}
              </div>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-primary bg-primary/10 hover:bg-primary/20 rounded-lg p-2 cursor-pointer transition-colors border border-primary/20`}>
                <FileText className="w-5 h-5 flex-shrink-0 text-primary" />
                {!sidebarCollapsed && <span className="font-medium text-primary">Audit Logs</span>}
              </div>
            </nav>
          </div>

          {/* Sidebar Footer */}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>System Activities</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search logs..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">Loading...</div>
              ) : error ? (
                <div className="text-red-500 p-4">{error}</div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                              No logs found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{getInitials(log.user_name || 'Unknown')}</AvatarFallback>
                                  </Avatar>
                                  <span>{log.user_name || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {log.role || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.action}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {log.details ? JSON.stringify(log.details) : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

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
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
