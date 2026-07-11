"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Edit, X, User, ChevronDown, ChevronUp } from "lucide-react"
import { type MediaBooking } from "@/lib/api"
import { useState } from "react"

interface BookingCardProps {
    booking: MediaBooking
    onEdit?: (booking: MediaBooking) => void
    onCancel?: (booking: MediaBooking) => void
    onContactCustomer?: (booking: MediaBooking) => void
    showCustomer?: boolean   // for coordinator view
    customerView?: boolean
    showActions?: boolean
}

const statusColors: Record<string, string> = {
    to_assign: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    confirmed: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    active: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
}

const statusLabels: Record<string, string> = {
    to_assign: 'To Assign',
    pending: 'Pending',
    confirmed: 'Confirmed',
    complete: 'Complete',
    canceled: 'Canceled',
    active: 'Active',
}

export function BookingCard({ booking, onEdit, onCancel, onContactCustomer, showCustomer, customerView = false, showActions = true }: BookingCardProps) {
    const canEdit = ['to_assign', 'pending'].includes(booking.status)
    const canCancel = !['canceled', 'complete'].includes(booking.status)
    const [expanded, setExpanded] = useState(false)

    const startDate = new Date(booking.start_datetime)
    const endDate = new Date(booking.end_datetime)
    const displayStatus = customerView && ['to_assign', 'pending', 'confirmed'].includes(booking.status)
        ? 'active'
        : booking.status

    const hasExtras = booking.ac_required || booking.spotlight_required || booking.led_light_required || booking.equipment_request || booking.cancel_reason

    return (
        <div className="flex flex-col p-4 bg-muted/50 rounded-lg gap-3 hover:bg-muted/70 transition-colors border border-border/50">
            {/* Main row */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-foreground truncate">{booking.event_name}</h4>
                        <Badge className={`text-xs px-2 py-0.5 border-none shrink-0 ${statusColors[displayStatus] ?? 'bg-muted text-muted-foreground'}`}>
                            {statusLabels[displayStatus] ?? displayStatus}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {booking.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {startDate.toLocaleDateString()} &nbsp;
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {showCustomer && booking.customer && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> {booking.customer.name}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Expand toggle for extra details */}
                    {hasExtras && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                            onClick={() => setExpanded(v => !v)}>
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    )}

                    {showActions && (
                        <>
                            {onContactCustomer && booking.status === 'to_assign' && (
                                <Button variant="outline" size="sm" onClick={() => onContactCustomer(booking)}>
                                    <User className="w-4 h-4 mr-1" /> Contact Customer
                                </Button>
                            )}
                            {onEdit && canEdit && (
                                <Button variant="ghost" size="icon" onClick={() => onEdit(booking)}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary">
                                    <Edit className="w-4 h-4" />
                                </Button>
                            )}
                            {onCancel && canCancel && (
                                <Button variant="ghost" size="icon" onClick={() => onCancel(booking)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && hasExtras && (
                <div className="border-t border-border/50 pt-3 text-sm text-muted-foreground space-y-1.5">
                    {booking.equipment_request && (
                        <p><span className="font-medium text-foreground">Equipment:</span> {booking.equipment_request}</p>
                    )}
                    {(booking.ac_required || booking.spotlight_required || booking.led_light_required) && (
                        <p>
                            <span className="font-medium text-foreground">Additional:</span>{' '}
                            {[
                                booking.ac_required && 'AC',
                                booking.spotlight_required && 'Spotlight',
                                booking.led_light_required && 'LED Light',
                            ].filter(Boolean).join(', ')}
                        </p>
                    )}
                    {booking.cancel_reason && (
                        <p><span className="font-medium text-destructive">Cancel reason:</span> {booking.cancel_reason}</p>
                    )}
                </div>
            )}
        </div>
    )
}
