"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Trash2, MessageSquare } from "lucide-react"
import { mediaBookingAPI, type MediaBooking, type BookingComment } from "@/lib/api"

interface BookingCommentsModalProps {
    booking: MediaBooking | null
    isOpen: boolean
    onClose: () => void
    isStaff?: boolean
}

export function BookingCommentsModal({ booking, isOpen, onClose, isStaff = false }: BookingCommentsModalProps) {
    const [comments, setComments] = useState<BookingComment[]>([])
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [newComment, setNewComment] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [doneLoading, setDoneLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const fetchComments = async () => {
        if (!booking) return
        setLoading(true)
        setError(null)
        try {
            const res = await mediaBookingAPI.getComments(booking.id)
            setComments(res.comments ?? [])
        } catch {
            setError("Failed to load comments.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && booking) {
            fetchComments()
            setNewComment("")
        }
    }, [isOpen, booking])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [comments])

    const handleSend = async () => {
        if (!booking || !newComment.trim()) return
        setSending(true)
        try {
            const res = await mediaBookingAPI.addComment(booking.id, newComment.trim())
            setComments(prev => [...prev, res.comment])
            setNewComment("")
        } catch {
            setError("Failed to send comment.")
        } finally {
            setSending(false)
        }
    }

    const handleDone = async () => {
        if (!booking) return
        setDoneLoading(true)
        try {
            await mediaBookingAPI.deleteAllComments(booking.id)
            setComments([])
        } catch {
            setError("Failed to delete comments.")
        } finally {
            setDoneLoading(false)
        }
    }

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const isCompleted = booking?.status === 'complete' || (booking?.status as string) === 'completed';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card/95 backdrop-blur-xl border border-border sm:max-w-lg rounded-2xl p-0 gap-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Comments
                        {booking && <span className="text-sm font-normal text-muted-foreground">— {booking.event_name}</span>}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">Loading comments…</div>
                    ) : error ? (
                        <div className="py-4 text-center text-destructive text-sm">{error}</div>
                    ) : comments.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">No comments yet. Start the conversation!</div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary dark:text-white">
                                        {getInitials(c.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium text-foreground">{c.user.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(c.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="border-t border-border px-5 py-3 shrink-0 space-y-2">
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2">
                        <Textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={isCompleted ? "Comments are disabled for completed bookings" : "Write a comment…"}
                            className="min-h-[2.5rem] max-h-24 text-sm bg-background/50 resize-none"
                            rows={1}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey && !isCompleted) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                            disabled={isCompleted}
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={sending || !newComment.trim() || isCompleted}
                            className="shrink-0 self-end"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    {isStaff && comments.length > 0 && (
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDone}
                                disabled={doneLoading}
                                className="text-xs text-muted-foreground"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                {doneLoading ? "Deleting…" : "Done"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
