"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail, Phone, User } from "lucide-react"
import { mediaBookingAPI, type MediaBooking } from "@/lib/api"

interface CustomerContactModalProps {
    booking: MediaBooking | null
    isOpen: boolean
    onClose: () => void
}

export function CustomerContactModal({ booking, isOpen, onClose }: CustomerContactModalProps) {
    const [customer, setCustomer] = useState<{
        id: string; name: string; email: string; phone: string
    } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (isOpen && booking) {
            setLoading(true)
            setError(false)
            setCustomer(null)
            mediaBookingAPI.getCustomerInfo(booking.id)
                .then(r => setCustomer(r.customer))
                .catch(() => setError(true))
                .finally(() => setLoading(false))
        }
    }, [isOpen, booking])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card/95 backdrop-blur-xl border border-border sm:max-w-md rounded-2xl p-5 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Customer Information</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : error ? (
                    <div className="py-4 text-center text-destructive">Failed to load customer info.</div>
                ) : customer ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">{customer.name}</p>
                            </div>
                        </div>

                        <div className="space-y-2 pl-1">
                            <a
                                href={`mailto:${customer.email}`}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Mail className="w-4 h-4 shrink-0" />
                                {customer.email}
                            </a>
                            {customer.phone && (
                                <a
                                    href={`tel:${customer.phone}`}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Phone className="w-4 h-4 shrink-0" />
                                    {customer.phone}
                                </a>
                            )}
                        </div>

                        {booking && (
                            <div className="pt-2 border-t border-border space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Booking:</span> {booking.event_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Location:</span> {booking.location}
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}

                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
