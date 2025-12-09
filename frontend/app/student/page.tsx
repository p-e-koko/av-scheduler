"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Search, 
  Grid3X3,
  List,
  ArrowLeft,
  Plus,
  Download,
  UserIcon,
  Mail,
  CheckCircle,
  XCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { auth } from "@/lib/auth"
import { StudentProfileContent } from "@/components/StudentProfileContent"

import { 
  userAPI,
  formatAPIError,
  type User as UserType,
  type UsersQueryParams
} from "@/lib/api"

function StudentProfileView({ currentUser }: { currentUser: UserType }) {
  return <StudentProfileContent studentId={currentUser.id} />
}

function StudentListView() {
  const router = useRouter()
  const [students, setStudents] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)

        const params: UsersQueryParams = {
          role: 'student',
          page: currentPage,
          per_page: 20,
          search: searchTerm || undefined
        }

        const response = await userAPI.getUsers(params)
        setStudents(response.data)
        setTotalPages(Math.ceil((response.meta?.total || response.data.length) / 20))
      } catch (err) {
        setError(formatAPIError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [currentPage, searchTerm])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Use API search results directly (no client-side filtering needed)
  const filteredStudents = students

  const handleStudentClick = (studentId: string) => {
    router.push(`/student/${studentId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.back()} 
              variant="ghost"
              className="bg-white/80 backdrop-blur-xl hover:bg-gray-100 text-gray-900 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">All Students</h1>
              <p className="text-gray-600">Manage and view student profiles</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white/80 backdrop-blur-xl border-gray-300/30">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="bg-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search students by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-xl border-gray-300/30 focus:border-primary"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "card" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                    className="px-3"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        </div>

        {/* Students List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search terms" : "No students available"}
            </p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.map((student) => (
                  <Card 
                    key={student.id}
                    className="bg-white/90 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                    onClick={() => handleStudentClick(student.id)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-4">
                          <AvatarImage src={student.profile_picture_url || ""} />
                          <AvatarFallback className="bg-primary text-white text-lg font-semibold">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <h3 className="font-semibold text-gray-900 mb-1">{student.name}</h3>
                        <div className="flex items-center justify-center gap-1.5 mb-2">
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.email_verified_at ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                        
                        {student.student_id && (
                          <p className="text-xs text-gray-500 mb-3">ID: {student.student_id}</p>
                        )}
                        
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="secondary" className="text-xs">Student</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {student.promised_hours_per_week || '0'}h/week
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => (
                      <div 
                        key={student.id}
                        className="p-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => handleStudentClick(student.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={student.profile_picture_url || ""} />
                              <AvatarFallback className="bg-primary text-white font-semibold">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <h3 className="font-semibold text-gray-900">{student.name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {student.email}
                                  {student.email_verified_at ? (
                                    <CheckCircle className="w-3 h-3 ml-1.5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3 h-3 ml-1.5 text-red-500" />
                                  )}
                                </span>
                                {student.student_id && (
                                  <span className="flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1" />
                                    {student.student_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Student</Badge>
                            <Badge variant="secondary">
                              {student.promised_hours_per_week || '0'}h/week
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function StudentPageHandler() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = auth.getCurrentUser()
    setCurrentUser(user)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!currentUser) return null

  if (currentUser.role === 'student') {
    return <StudentProfileView currentUser={currentUser} />
  }

  return <StudentListView />
}

export default function ProtectedStudentsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['admin', 'coordinator', 'supervisor', 'student']}>
      <StudentPageHandler />
    </RoleProtectedRoute>
  )
}
