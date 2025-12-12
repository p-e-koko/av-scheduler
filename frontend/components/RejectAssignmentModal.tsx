"use client"

import * as React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface RejectAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  assignmentName: string
}

export function RejectAssignmentModal({
  isOpen,
  onClose,
  onConfirm,
  assignmentName
}: RejectAssignmentModalProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejection")
      return
    }
    onConfirm(reason)
    setReason("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Reject Assignment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to reject "{assignmentName}"? Please provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder="I cannot accept this assignment because..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError("")
            }}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Reject Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
