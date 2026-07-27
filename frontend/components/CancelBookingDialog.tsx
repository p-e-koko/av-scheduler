"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"

interface CancelBookingDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (reason: string) => void
    loading?: boolean
    title?: string
}

export function CancelBookingDialog({
    isOpen,
    onClose,
    onConfirm,
    loading,
    title = "Cancel Booking",
}: CancelBookingDialogProps) {
    const [reason, setReason] = useState("")

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason.trim())
            setReason("")
        }
    }

    const handleClose = () => {
        setReason("")
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-card/95 backdrop-blur-xl border border-border max-w-[90vw] sm:max-w-md rounded-2xl p-5 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Please provide a reason for cancellation. This will be sent to the customer and coordination team.
                    </p>
                    <div>
                        <Label htmlFor="cancel-reason" className="text-foreground">Reason *</Label>
                        <Textarea
                            id="cancel-reason"
                            placeholder="Enter cancellation reason..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            className="mt-1 bg-background/50"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        Keep Booking
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!reason.trim() || loading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? "Canceling..." : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
