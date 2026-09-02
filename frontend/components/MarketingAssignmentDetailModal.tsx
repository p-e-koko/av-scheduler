"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Calendar, MapPin, FileText, HelpCircle, Package, User,
    CheckCircle, AlertCircle, Check,
} from "lucide-react"
import { type Assignment } from "@/lib/api"
import { api, formatAPIError } from "@/lib/api"

interface MarketingAssignmentDetailModalProps {
    isOpen: boolean
    onClose: () => void
    assignment: Assignment | null
    /** Current logged-in user id — used to determine which row is "me" */
    currentUserId?: number
    /** Whether the viewer is a student_ambassador (hides reject button) */
    isAmbassador?: boolean
    onAccept?: (assignmentId: number) => Promise<void>
    onReject?: (assignmentId: number, reason: string) => Promise<void>
    onRefresh?: () => void
}

const STATUS_BADGE: Record<string, React.ReactNode> = {
    complete: <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>,
    confirmed: <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>,
    pending: <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pending</Badge>,
    to_assign: <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">To Assign</Badge>,
    canceled: <Badge className="bg-red-100 text-red-800 border-red-200">Canceled</Badge>,
}

const USER_STATUS_CLASS: Record<string, string> = {
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export function MarketingAssignmentDetailModal({
    isOpen,
    onClose,
    assignment,
    currentUserId,
    isAmbassador = false,
    onAccept,
    onReject,
    onRefresh,
}: MarketingAssignmentDetailModalProps) {
    const [equipment, setEquipment] = useState<any[]>([])
    const [eqLoading, setEqLoading] = useState(false)
    const [accepting, setAccepting] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectInput, setShowRejectInput] = useState(false)

    useEffect(() => {
        if (!isOpen || !assignment) return
        setEqLoading(true)
        api.get(`/assignments/${assignment.id}/marketing-equipment`)
            .then((res: any) => setEquipment(res.data.data || res.data || []))
            .catch(() => setEquipment([]))
            .finally(() => setEqLoading(false))
    }, [isOpen, assignment])

    if (!assignment) return null

    const fmt = (d: string, opts?: Intl.DateTimeFormatOptions) =>
        new Date(d).toLocaleDateString('en-US', opts || { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const fmtTime = (d: string) =>
        new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const myPivot = assignment.users?.find((u: any) => u.id === currentUserId) as any
    const myStatus = myPivot?.pivot?.status

    const handleAccept = async () => {
        if (!onAccept || !assignment) return
        setAccepting(true)
        try { await onAccept(assignment.id); onRefresh?.(); onClose() }
        finally { setAccepting(false) }
    }

    const handleReject = async () => {
        if (!onReject || !assignment || !rejectReason.trim()) return
        setRejecting(true)
        try { await onReject(assignment.id, rejectReason); onRefresh?.(); onClose() }
        finally { setRejecting(false); setRejectReason(''); setShowRejectInput(false) }
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl font-bold text-foreground">
                            {assignment.assignment_name}
                        </DialogTitle>
                        {STATUS_BADGE[assignment.status] || <Badge variant="outline">{assignment.status}</Badge>}
                    </div>
                    <DialogDescription>Marketing assignment details</DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Basic info */}
                    <div className="space-y-3">
                        {[
                            { icon: <FileText className="w-4 h-4 text-pink-500" />, label: 'Event Name', value: assignment.event_name },
                            { icon: <MapPin className="w-4 h-4 text-pink-500" />, label: 'Location', value: assignment.event_location },
                            { icon: <HelpCircle className="w-4 h-4 text-pink-500" />, label: 'Description', value: assignment.description },
                        ].filter(r => r.value).map(row => (
                            <div key={row.label} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {row.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
                                    <p className="text-sm text-foreground">{row.value}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar className="w-4 h-4 text-pink-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Date & Time</p>
                                <p className="text-sm text-foreground">{fmt(assignment.event_start_datetime)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {fmtTime(assignment.event_start_datetime)} – {fmtTime(assignment.event_end_datetime)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Equipment */}
                    <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-pink-500" />
                            Equipment
                        </h4>
                        {eqLoading ? (
                            <p className="text-xs text-muted-foreground">Loading equipment...</p>
                        ) : equipment.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No equipment assigned to this event.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {equipment.map((eq: any) => (
                                    <div key={eq.id} className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border text-sm">
                                        <span className="font-medium text-foreground">{eq.name}</span>
                                        <Badge className={`text-xs border ${eq.pivot?.currently_using ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                            {eq.pivot?.currently_using ? 'In Use' : 'Available'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assigned Ambassadors */}
                    <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-pink-500" />
                            Assigned Ambassadors ({assignment.users?.length || 0})
                        </h4>
                        {assignment.users && assignment.users.length > 0 ? (
                            <div className="space-y-2">
                                {(assignment.users as any[]).map((u: any) => (
                                    <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${u.id === currentUserId ? 'border-pink-300/60 bg-pink-50/40 dark:bg-pink-900/10' : 'border-border bg-muted/40'}`}>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.profile_picture || u.profile_picture_url} />
                                                <AvatarFallback className="text-xs bg-pink-100 text-pink-700">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{u.name} {u.id === currentUserId && <span className="text-xs text-pink-500">(you)</span>}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                        {u.pivot?.status && (
                                            <Badge className={`text-xs capitalize border-0 ${USER_STATUS_CLASS[u.pivot.status] || ''}`}>
                                                {u.pivot.status}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No ambassadors assigned yet.</p>
                        )}
                    </div>

                    {/* Accept/Reject for student ambassador */}
                    {myStatus === 'pending' && currentUserId && (
                        <div className="border-t border-border pt-4 space-y-3">
                            {showRejectInput && !isAmbassador && (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full border border-border rounded p-2 text-sm bg-background resize-none"
                                        rows={3}
                                        placeholder="Enter rejection reason..."
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                                        <Button variant="destructive" size="sm" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
                                            {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {!showRejectInput && (
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleAccept} disabled={accepting} className="bg-green-600 hover:bg-green-700 text-white">
                                        <Check className="w-4 h-4 mr-1" />
                                        {accepting ? 'Accepting...' : 'Accept'}
                                    </Button>
                                    {!isAmbassador && (
                                        <Button variant="destructive" size="sm" onClick={() => setShowRejectInput(true)}>
                                            Reject
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {myStatus === 'accepted' && (
                        <div className="border-t border-border pt-3 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">You have accepted this assignment.</span>
                        </div>
                    )}
                    {myStatus === 'rejected' && (
                        <div className="border-t border-border pt-3 flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">You have rejected this assignment.</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
