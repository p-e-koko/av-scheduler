"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"

function MarketingAuditLogsContent() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedRole, setSelectedRole] = useState<string>("all")

    useEffect(() => {
        const user = getStoredUser()
        if (!user) {
            router.push('/login')
            return
        }

        if (!hasAnyRole(['admin', 'marketing_supervisor', 'marketing_coordinator'])) {
            router.push('/login')
            return
        }

        setCurrentUser(user)
    }, [router])

    const fetchLogs = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await auditLogAPI.getLogs({
                page: currentPage,
                search: searchQuery || undefined,
                role: selectedRole !== "all" ? selectedRole : undefined,
                department: "marketing"
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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentUser) {
                setCurrentPage(1)
                fetchLogs()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, currentUser])

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
        <>
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Marketing Audit Logs</h1>
                        <p className="text-sm text-muted-foreground mt-1">View Marketing department system activities and changes</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <Card className="border-none shadow-lg bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <CardTitle>System Activities</CardTitle>
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search logs..."
                                        className="pl-8 w-full"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Filter by Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="marketing_supervisor">Marketing Supervisor</SelectItem>
                                        <SelectItem value="marketing_coordinator">Marketing Coordinator</SelectItem>
                                        <SelectItem value="student_ambassador">Student Ambassador</SelectItem>
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
                                <div className="rounded-md border overflow-x-auto">
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
                                                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-xs">
                                                            {log.details ? JSON.stringify(log.details) : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {pagination && pagination.last_page > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 sm:gap-0">
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
        </>
    )
}

export default function MarketingAuditLogsPage() {
    return (
        <RoleProtectedRoute allowedRoles={['admin', 'marketing_supervisor', 'marketing_coordinator']}>
            <MarketingAuditLogsContent />
        </RoleProtectedRoute>
    )
}
