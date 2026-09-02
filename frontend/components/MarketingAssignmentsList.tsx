"use client"

import { useState, useEffect } from "react"
import { ClipboardList, Clock, Search, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api, type Assignment } from "@/lib/api"
import { MarketingAssignmentDetailModal } from "@/components/MarketingAssignmentDetailModal"

interface MarketingAssignmentsListProps {
    readonly?: boolean;
}

export function MarketingAssignmentsList({ readonly = false }: MarketingAssignmentsListProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const fetchAssignments = async () => {
        try {
            setLoading(true)
            const data: any = await api.get('/assignments?department=marketing')
            setAssignments(Array.isArray(data) ? data : data.data || [])
        } catch (err: any) {
            console.error('Failed to fetch marketing assignments:', err)
            setError(err.message || 'Failed to fetch assignments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAssignments()
    }, [])

    const filteredAssignments = assignments.filter((assignment) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase()
        return (
            (assignment.assignment_name && assignment.assignment_name.toLowerCase().includes(query)) ||
            (assignment.event_name && assignment.event_name.toLowerCase().includes(query)) ||
            (assignment.event_location && assignment.event_location.toLowerCase().includes(query))
        )
    })

    // Since we also need to append created_by as per Phase 11 polish
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assignments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-card/80 backdrop-blur-xl border-border focus:border-marketing-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
            ) : (
                <div className="space-y-4">
                    {filteredAssignments.map((assignment) => (
                        <div
                            key={assignment.id}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-card/60 backdrop-blur-sm border border-border rounded-lg gap-4 cursor-pointer hover:bg-muted/70 transition-colors"
                            onClick={() => {
                                setSelectedAssignment(assignment)
                                setIsDetailModalOpen(true)
                            }}
                        >
                            <div className="flex items-center space-x-4 w-full md:w-auto">
                                <div className="w-10 h-10 rounded-lg bg-marketing-100 flex items-center justify-center flex-shrink-0">
                                    <ClipboardList className="w-5 h-5 text-marketing-600 dark:text-marketing-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-semibold text-foreground truncate">{assignment.assignment_name}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{assignment.event_name} • {assignment.event_location}</p>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground mt-1">
                                        <span>{new Date(assignment.event_start_datetime).toLocaleDateString()}</span>
                                        {assignment.creator && (
                                            <span className="mt-1 sm:mt-0">
                                                Created by: <span className="font-medium text-foreground ml-1">{assignment.creator.name}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto justify-end">
                                <Badge
                                    variant="secondary"
                                    className={`text-xs px-2 py-0.5 border-none ${assignment.status === 'complete' ? 'bg-green-100 text-green-800' :
                                        assignment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-marketing-100 text-marketing-800'
                                        }`}
                                >
                                    {assignment.status}
                                </Badge>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-marketing-600 dark:hover:text-white"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedAssignment(assignment)
                                        setIsDetailModalOpen(true)
                                    }}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>

                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive dark:hover:text-red-400"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            // Real implementation would connect to delete endpoint
                                            alert("Delete logic not fully integrated here yet.")
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredAssignments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No marketing assignments found.</div>
                    )}
                </div>
            )}

            {selectedAssignment && (
                <MarketingAssignmentDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false)
                        setSelectedAssignment(null)
                    }}
                    assignment={selectedAssignment}
                />
            )}
        </div>
    )
}
