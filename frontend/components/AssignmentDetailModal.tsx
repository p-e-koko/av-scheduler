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
import { Calendar, MapPin, Clock, User, FileText, CheckCircle, AlertCircle, HelpCircle } from "lucide-react"
import { type Assignment } from "@/lib/api"

interface AssignmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: Assignment | null
}

export function AssignmentDetailModal({ isOpen, onClose, assignment }: AssignmentDetailModalProps) {
  if (!assignment) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Completed</Badge>
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Active</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">Pending</Badge>
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <DialogTitle className="text-xl font-bold text-gray-900">Assignment Details</DialogTitle>
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
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Event Name</h4>
                <p className="text-base font-semibold text-gray-900">{assignment.event_name}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Location</h4>
                <p className="text-base text-gray-900">{assignment.event_location}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
                <p className="text-base text-gray-900">
                  {formatDate(assignment.event_start_datetime)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatTime(assignment.event_start_datetime)} - {formatTime(assignment.event_end_datetime)}
                </p>
              </div>
            </div>

            {assignment.description && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{assignment.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Students */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Assigned Students ({assignment.users?.length || 0})
              </h4>
              {assignment.users && assignment.users.length > 0 && (
                <div className="flex gap-2">
                    {assignment.users.every(u => (u as any).pivot?.status === 'accepted') && (
                      <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> All Accepted
                      </Badge>
                    )}
                    {assignment.users.some(u => (u as any).pivot?.status === 'rejected') && (
                      <Badge variant="outline" className="text-xs text-red-600 bg-red-50 border-red-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Rejected
                      </Badge>
                    )}
                </div>
              )}
            </div>
            
            {assignment.users && assignment.users.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {assignment.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {(user as any).pivot?.position && (
                        <Badge variant="outline" className="text-xs bg-white">
                          {(user as any).pivot.position}
                        </Badge>
                      )}
                      {(user as any).pivot?.status && (
                        <Badge className={`text-[10px] px-1.5 py-0 border-none capitalize ${
                          (user as any).pivot.status === 'accepted' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          (user as any).pivot.status === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                          'bg-orange-100 text-orange-800 hover:bg-orange-200'
                        }`}>
                          {(user as any).pivot.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No students assigned yet.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
