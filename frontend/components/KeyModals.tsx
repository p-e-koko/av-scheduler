"use client"

import { useState, useEffect } from "react"
import { X, Key as KeyIcon, Loader2, Check, Clock, History, User as UserIcon, BookOpen, AlertCircle, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { keyAPI, formatAPIError, type Key, type KeyCheckout, type User } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

// --- KeyActionModal (Add/Edit) ---
interface KeyActionProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    editKey?: Key | null
}

export function KeyActionModal({ isOpen, onClose, onSaved, editKey }: KeyActionProps) {
    const isEdit = !!editKey
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ code: "", description: "" })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            if (editKey) {
                setForm({ code: editKey.code, description: editKey.description })
            } else {
                setForm({ code: "", description: "" })
            }
        }
    }, [isOpen, editKey])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (isEdit && editKey) {
                await keyAPI.update(editKey.id, form)
            } else {
                await keyAPI.create(form)
            }
            onSaved()
            onClose()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <KeyIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{isEdit ? "Edit Key" : "Add New Key"}</h2>
                            <p className="text-xs text-muted-foreground">Register or update room access keys</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="key-code" className="text-sm font-semibold">Key Code <span className="text-destructive">*</span></Label>
                            <Input id="key-code" required value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                placeholder="e.g. A101"
                                className="bg-muted/30 border-border/50 focus:border-primary transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="key-desc" className="text-sm font-semibold">Description <span className="text-destructive">*</span></Label>
                            <textarea id="key-desc" required value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="e.g. Main Lab Room 101"
                                className="flex min-h-[100px] w-full rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary transition-all" />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                <X className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="flex-1 rounded-xl shadow-lg shadow-primary/20" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                {isEdit ? "Save Changes" : "Register Key"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

// --- KeyCheckoutModal ---
interface KeyCheckoutProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    targetKey?: Key | null
}

export function KeyCheckoutModal({ isOpen, onClose, onSaved, targetKey }: KeyCheckoutProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ student_id: "", purpose: "" })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setForm({ student_id: "", purpose: "" })
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetKey) return
        setLoading(true)
        setError(null)
        try {
            await keyAPI.checkout(targetKey.id, form)
            onSaved()
            onClose()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !targetKey) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold italic">Key Checkout</h2>
                        <p className="text-sm text-muted-foreground mt-1">Checking out key <span className="font-bold text-foreground">"{targetKey.code}"</span></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 text-left pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="checkout-sid" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student ID <span className="text-destructive">*</span></Label>
                            <Input id="checkout-sid" required value={form.student_id}
                                onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                                placeholder="Enter your Student ID"
                                className="bg-muted/30 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="checkout-purpose" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose <span className="text-destructive">*</span></Label>
                            <Input id="checkout-purpose" required value={form.purpose}
                                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                placeholder="Why are you taking this key?"
                                className="bg-muted/30 border-border/50" />
                        </div>

                        {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{error}</p>}

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Checkout"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

// --- KeyHistoryModal ---
interface KeyHistoryProps {
    isOpen: boolean
    onClose: () => void
    targetKey?: Key | null
}

export function KeyHistoryModal({ isOpen, onClose, targetKey }: KeyHistoryProps) {
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<KeyCheckout[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && targetKey) {
            const fetchHistory = async () => {
                try {
                    setLoading(true)
                    setError(null)
                    const res = await keyAPI.history(targetKey.id)
                    setHistory(res)
                } catch (err) {
                    setError(formatAPIError(err))
                } finally {
                    setLoading(false)
                }
            }
            fetchHistory()
        }
    }, [isOpen, targetKey])

    if (!isOpen || !targetKey) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <History className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold italic">Check-out History</h2>
                            <p className="text-xs text-muted-foreground">Usage logs for key <span className="font-bold text-foreground">{targetKey.code}</span></p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-sm">Fetching history...</p>
                        </div>
                    ) : error ? (
                        <div className="p-10 text-center text-destructive space-y-2">
                            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-20 text-center space-y-3">
                            <Clock className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                            <p className="text-muted-foreground font-medium">No history records found for this key.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-muted/50 sticky top-0 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground italic">Student</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground italic">Purpose</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground italic">Date & Time</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground italic">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {history.map((record) => (
                                        <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                                        {record.user?.name?.charAt(0) ?? "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{record.user?.name ?? "Unknown"}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">ID: {record.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-muted-foreground line-clamp-2 max-w-[200px]">{record.purpose}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                                                        <LogIn className="w-3 h-3" />
                                                        <span>{new Date(record.checked_out_at).toLocaleString()}</span>
                                                    </div>
                                                    {record.returned_at && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <LogOut className="w-3 h-3" />
                                                            <span>{new Date(record.returned_at).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {record.returned_at ? (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-2 py-0">Returned</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-2 py-0 animate-pulse">In Use</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
