"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Clock, User, FileText, CheckCircle, AlertCircle, HelpCircle, Check, XCircle } from "lucide-react"
import { type Assignment } from "@/lib/api"

interface AssignmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: Assignment | null
  onApproveBooking?: () => void
  onRejectBooking?: () => void
  onContactCustomer?: () => void
  bookingActionLoading?: boolean
}

export function AssignmentDetailModal({ isOpen, onClose, assignment, onApproveBooking, onRejectBooking, onContactCustomer, bookingActionLoading }: AssignmentDetailModalProps) {
  if (!assignment) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Completed</Badge>
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Active</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">Pending</Badge>
      case 'booking':
        return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-200 border-sky-200">Booking</Badge>
      case 'to_assign':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">To Assign</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Canceled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <DialogTitle className="text-xl font-bold text-foreground">Assignment Details</DialogTitle>
            {getStatusBadge(assignment.status)}
          </div>
          <DialogDescription>
            Detailed information about {assignment.assignment_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Info */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-primary dark:text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Event Name</h4>
                <p className="text-base font-semibold text-foreground">{assignment.event_name}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-primary dark:text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                <p className="text-base text-foreground">{assignment.event_location}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-primary dark:text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
                <p className="text-base text-foreground">
                  {formatDate(assignment.event_start_datetime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(assignment.event_start_datetime)} - {formatTime(assignment.event_end_datetime)}
                </p>
              </div>
            </div>

            {assignment.description && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-primary dark:text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-base text-foreground whitespace-pre-wrap">{assignment.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Linked Media Booking Info */}
          {assignment.mediaBooking && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center mb-3">
                <FileText className="w-4 h-4 mr-2" />
                Media Booking
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(assignment.mediaBooking.status)}
                </div>
                {assignment.mediaBooking.customer && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Requested By</span>
                      <span className="text-foreground font-medium text-right">{assignment.mediaBooking.customer.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground text-right break-all">{assignment.mediaBooking.customer.email}</span>
                    </div>
                  </div>
                )}
                {assignment.mediaBooking.equipment_request && (
                  <div className="flex items-start justify-between text-sm gap-4">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="text-foreground text-right">{assignment.mediaBooking.equipment_request}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned Students */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                <User className="w-4 h-4 mr-2" />
                Assigned Students ({assignment.users?.length || 0})
              </h4>
              {assignment.users && assignment.users.length > 0 && (
                <div className="flex gap-2">
                  {assignment.users.every(u => (u as any).pivot?.status === 'accepted') && (
                    <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> All Accepted
                    </Badge>
                  )}
                  {assignment.users.some(u => (u as any).pivot?.status === 'rejected') && (
                    <Badge variant="outline" className="text-xs text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Rejected
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {assignment.users && assignment.users.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {assignment.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_picture || user.profile_picture_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {(user as any).pivot?.position && (
                        <Badge variant="outline" className="text-xs bg-background">
                          {(user as any).pivot.position}
                        </Badge>
                      )}
                      {(user as any).pivot?.status && (
                        <Badge className={`text-[10px] px-1.5 py-0 border-none capitalize ${(user as any).pivot.status === 'accepted' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' :
                            (user as any).pivot.status === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                          {(user as any).pivot.status}
                        </Badge>
                      )}
                      {(user as any).pivot?.status === 'rejected' && (user as any).pivot?.rejection_reason && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 max-w-[150px] text-right truncate" title={(user as any).pivot.rejection_reason}>
                          Reason: {(user as any).pivot.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No students assigned yet.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2 order-2 sm:order-1">
            {onContactCustomer && (
              <Button variant="outline" size="sm" onClick={onContactCustomer}>
                <User className="w-4 h-4 mr-1" /> Contact Customer
              </Button>
            )}
          </div>
          <div className="flex gap-2 order-1 sm:order-2">
            {onApproveBooking && (
              <Button
                size="sm"
                onClick={onApproveBooking}
                disabled={bookingActionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
            )}
            {onRejectBooking && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onRejectBooking}
                disabled={bookingActionLoading}
              >
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

