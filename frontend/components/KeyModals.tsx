"use client"

import { useState, useEffect } from "react"
import { X, Key as KeyIcon, Loader2, Check, Clock, History, User as UserIcon, BookOpen, AlertCircle, LogIn, LogOut, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { keyAPI, userAPI, formatAPIError, type Key, type KeyCheckout, type User } from "@/lib/api"
import { Search } from "lucide-react"
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
    const [users, setUsers] = useState<User[]>([])
    const [userSearch, setUserSearch] = useState("")
    const [isUserListOpen, setIsUserListOpen] = useState(false)
    const [form, setForm] = useState({ code: "", description: "", assigned_user_id: "" as string | null })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            fetchUsers()
            if (editKey) {
                setForm({
                    code: editKey.code,
                    description: editKey.description,
                    assigned_user_id: editKey.assigned_user_id || null
                })
                if (editKey.assigned_user) {
                    setUserSearch(editKey.assigned_user.name)
                } else {
                    setUserSearch("")
                }
            } else {
                setForm({ code: "", description: "", assigned_user_id: null })
                setUserSearch("")
            }
        }
    }, [isOpen, editKey])

    const fetchUsers = async () => {
        try {
            const response = await userAPI.getUsers({ per_page: 2000 })
            setUsers(response.data)
        } catch (err) {
            console.error("Failed to fetch users:", err)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.student_id && u.student_id.toLowerCase().includes(userSearch.toLowerCase()))
    )

    const selectedUser = users.find(u => u.id === form.assigned_user_id)

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

                        <div className="space-y-2 relative">
                            <Label className="text-sm font-semibold">Original Key Holder (Optional)</Label>
                            <div className="relative">
                                <Input
                                    placeholder="Search user by name or ID..."
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value)
                                        setIsUserListOpen(true)
                                    }}
                                    onFocus={() => setIsUserListOpen(true)}
                                    className="bg-muted/30 border-border/50 pr-10"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>

                            {isUserListOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    <div
                                        className="p-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/20 sticky top-0 backdrop-blur-md"
                                        onClick={() => {
                                            setForm(f => ({ ...f, assigned_user_id: null }))
                                            setUserSearch("")
                                            setIsUserListOpen(false)
                                        }}
                                    >
                                        Clear assignment
                                    </div>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.slice(0, 20).map(u => (
                                            <div
                                                key={u.id}
                                                className="p-3 hover:bg-primary/10 cursor-pointer transition-colors border-b border-border/50 last:border-0 flex flex-col gap-0.5"
                                                onClick={() => {
                                                    setForm(f => ({ ...f, assigned_user_id: u.id }))
                                                    setUserSearch(u.name)
                                                    setIsUserListOpen(false)
                                                }}
                                            >
                                                <span className="text-sm font-semibold">{u.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{u.student_id || u.email}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No users found</div>
                                    )}
                                </div>
                            )}

                            {selectedUser && (
                                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-medium">{selectedUser.name} selected</span>
                                </div>
                            )}
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
    const [form, setForm] = useState({ purpose: "" })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setForm({ purpose: "" })
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

// --- KeyDetailModal (Click-to-view: current holder + checkout/return + history) ---
interface KeyDetailProps {
    isOpen: boolean
    onClose: () => void
    onRefresh: () => void
    targetKey?: Key | null
    currentUser: User | null
}

export function KeyDetailModal({ isOpen, onClose, onRefresh, targetKey, currentUser }: KeyDetailProps) {
    const [history, setHistory] = useState<KeyCheckout[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const [returnLoading, setReturnLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [form, setForm] = useState({ purpose: "" })
    // Local copy of the key so we can update after checkout/return
    const [localKey, setLocalKey] = useState<Key | null>(null)

    useEffect(() => {
        if (isOpen && targetKey) {
            setError(null)
            setSuccess(null)
            setForm({ purpose: "" })
            setLocalKey(targetKey)
            fetchHistory(targetKey.id)
        }
    }, [isOpen, targetKey])

    const fetchHistory = async (keyId: string) => {
        try {
            setHistoryLoading(true)
            const res = await keyAPI.history(keyId)
            setHistory(res)
        } catch (err) {
            // Non-blocking: history fetch failure shouldn't block the modal
        } finally {
            setHistoryLoading(false)
        }
    }

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!localKey) return
        setCheckoutLoading(true)
        setError(null)
        setSuccess(null)
        try {
            await keyAPI.checkout(localKey.id, form)
            setSuccess("Key checked out successfully!")
            setForm({ purpose: "" })
            // Refresh key data and history
            const updatedKey = await keyAPI.get(localKey.id)
            setLocalKey(updatedKey)
            await fetchHistory(localKey.id)
            onRefresh()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setCheckoutLoading(false)
        }
    }

    const handleReturn = async () => {
        if (!localKey) return
        setReturnLoading(true)
        setError(null)
        setSuccess(null)
        try {
            await keyAPI.return(localKey.id)
            setSuccess("Key returned successfully!")
            // Refresh key data and history
            const updatedKey = await keyAPI.get(localKey.id)
            setLocalKey(updatedKey)
            await fetchHistory(localKey.id)
            onRefresh()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setReturnLoading(false)
        }
    }

    if (!isOpen || !targetKey) return null

    const isCheckedOut = !!localKey?.current_checkout
    const holder = localKey?.current_checkout

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCheckedOut ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                            <KeyIcon className={`w-6 h-6 ${isCheckedOut ? "text-amber-500" : "text-emerald-500"}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{localKey?.code}</h2>
                            <p className="text-sm text-muted-foreground">{localKey?.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {localKey?.assigned_user && (
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 dark:bg-white/10 dark:border-white/20">
                                <BookOpen className="w-3 h-3 text-primary dark:text-white" />
                                <span className="text-[10px] font-bold text-primary dark:text-white uppercase">Original Holder: {localKey.assigned_user.name}</span>
                            </div>
                        )}
                        <Badge variant="outline" className={`text-xs px-2.5 py-1 border ${isCheckedOut ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                            {isCheckedOut ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                            {isCheckedOut ? "Currently Held" : "Available"}
                        </Badge>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">

                    {/* Current Holder / Checkout Form Section */}
                    <div className="p-5 space-y-4 border-b border-border">

                        {isCheckedOut && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <UserIcon className="w-3.5 h-3.5" /> Current Key Holder
                                </h3>
                                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-600">
                                            {holder?.user?.name?.charAt(0) ?? "?"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground">{holder?.user?.name ?? "Unknown User"}</p>
                                            <p className="text-xs text-muted-foreground font-mono">ID: {holder?.student_id}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-amber-500/10">
                                        <p className="text-[10px] uppercase font-bold text-amber-500/70 tracking-wider">Purpose</p>
                                        <p className="text-sm italic text-foreground mt-0.5">{holder?.purpose}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions Section */}
                        <div className="pt-2">
                            {isCheckedOut && currentUser?.id === holder?.user_id ? (
                                /* Current user is the holder: only show Return */
                                <div className="space-y-4 mt-4">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-xl h-11"
                                        onClick={handleReturn}
                                        disabled={returnLoading}
                                    >
                                        {returnLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                                        Return Key (You have it)
                                    </Button>
                                </div>
                            ) : (
                                /* Key is available OR held by someone else: show Checkout form */
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <LogIn className="w-3.5 h-3.5" /> {isCheckedOut ? "Take From Current Holder" : "Take This Key"}
                                    </h3>
                                    <div className={`rounded-xl p-4 border ${isCheckedOut ? "bg-primary/5 border-primary/20" : "bg-emerald-500/5 border-emerald-500/15"}`}>
                                        <form onSubmit={handleCheckout} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="detail-purpose" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    Purpose <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="detail-purpose"
                                                    required
                                                    value={form.purpose}
                                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                                    placeholder={isCheckedOut ? "Handing over from previous student..." : "Why are you taking this key?"}
                                                    className="bg-background/50 border-border/50 focus:border-primary transition-all"
                                                />
                                            </div>
                                            <Button
                                                type="submit"
                                                className={`w-full rounded-xl h-11 shadow-lg ${isCheckedOut ? "bg-primary shadow-primary/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"}`}
                                                disabled={checkoutLoading}
                                            >
                                                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                                                {isCheckedOut ? "Confirm Handover" : "Checkout Key"}
                                            </Button>
                                            {isCheckedOut && (
                                                <p className="text-[10px] text-muted-foreground text-center italic mt-2">
                                                    Note: Taking this key will automatically complete the previous student's session.
                                                </p>
                                            )}
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error / Success Messages */}
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
                                <Check className="w-4 h-4 shrink-0" />
                                {success}
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                            <History className="w-3.5 h-3.5" /> Checkout History
                        </h3>

                        {historyLoading ? (
                            <div className="flex items-center justify-center py-10 text-muted-foreground">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm">Loading history...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10">
                                <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-20" />
                                <p className="text-sm text-muted-foreground">No checkout history yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Student</th>
                                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Purpose</th>
                                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Date & Time</th>
                                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {history.map((record) => (
                                            <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {record.user?.name?.charAt(0) ?? "?"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-foreground text-xs truncate">{record.user?.name ?? "Unknown"}</p>
                                                            <p className="text-[10px] text-muted-foreground font-mono">ID: {record.student_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[160px]">{record.purpose}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 text-emerald-500 text-xs">
                                                            <LogIn className="w-3 h-3" />
                                                            <span>{new Date(record.checked_out_at).toLocaleString()}</span>
                                                        </div>
                                                        {record.returned_at && (
                                                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                                                <LogOut className="w-3 h-3" />
                                                                <span>{new Date(record.returned_at).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
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
        </div>
    )
}
