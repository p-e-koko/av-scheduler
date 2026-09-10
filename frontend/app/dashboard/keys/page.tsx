"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Key as KeyIcon, Search, Plus, Edit, Trash2, Clock,
    CheckCircle, AlertCircle, ChevronLeft, Sun, Moon, BookOpen,
    MapPin, Check, LogIn, Loader2, Filter, Layers, UserCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { DashboardSidebarWrapper } from "@/components/DashboardSidebarWrapper"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    keyAPI, getStoredUser, formatAPIError, hasAnyRole,
    type Key, type User
} from "@/lib/api"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { KeyActionModal, KeyHistoryModal, KeyDetailModal } from "@/components/KeyModals"

function KeyManagementPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [keys, setKeys] = useState<Key[]>([])
    const [locations, setLocations] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [ownerFilter, setOwnerFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")

    // Multi-key selection
    const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([])
    const [showBulkTakeModal, setShowBulkTakeModal] = useState(false)
    const [bulkPurpose, setBulkPurpose] = useState("")
    const [bulkLoading, setBulkLoading] = useState(false)

    const [showActionModal, setShowActionModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const { theme, setTheme } = useTheme()
    const [selectedKey, setSelectedKey] = useState<Key | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string;
        action: () => void; variant?: "default" | "destructive"
    }>({ isOpen: false, title: "", description: "", action: () => { } })

    const canManage = hasAnyRole(["admin", "coordinator"])

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchKeys = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const [resKeys, locRes] = await Promise.all([
                keyAPI.list(),
                keyAPI.locations().catch(() => ({ locations: [] }))
            ])
            setKeys(resKeys)
            if (locRes.locations && locRes.locations.length > 0) {
                setLocations(locRes.locations)
            } else {
                const uniqueLocs = Array.from(new Set(resKeys.map(k => k.location).filter((l): l is string => !!l)))
                setLocations(uniqueLocs)
            }
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (currentUser) {
            fetchKeys()
        }
    }, [currentUser, fetchKeys])

    const handleDelete = (key: Key) => {
        setConfirmDialog({
            isOpen: true, variant: "destructive",
            title: "Delete Key",
            description: `Are you sure you want to delete key "${key.code}"?`,
            action: async () => {
                try {
                    await keyAPI.delete(key.id)
                    fetchKeys()
                } catch (err) { setError(formatAPIError(err)) }
            }
        })
    }

    const filteredKeys = keys.filter(k => {
        const matchesSearch = k.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            k.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (k.location && k.location.toLowerCase().includes(searchQuery.toLowerCase()))

        let matchesOwner = true
        if (ownerFilter !== "all") {
            const currentHolderId = k.current_checkout?.user_id
            const assignedId = k.assigned_user_id
            matchesOwner = currentHolderId === ownerFilter || assignedId === ownerFilter
        }

        const matchesLocation = locationFilter === "all" || k.location === locationFilter
        return matchesSearch && matchesOwner && matchesLocation
    })

    // Stats breakdown
    const totalKeysCount = keys.length
    const availableKeysCount = keys.filter(k => !k.current_checkout).length
    const takenKeysCount = keys.filter(k => !!k.current_checkout).length

    // Extract all unique users associated with keys
    const uniqueOwnersMap = new Map<string, string>()
    keys.forEach(k => {
        if (k.current_checkout?.user) {
            uniqueOwnersMap.set(k.current_checkout.user.id, k.current_checkout.user.name)
        }
        if (k.assigned_user) {
            uniqueOwnersMap.set(k.assigned_user.id, k.assigned_user.name)
        }
    })
    const uniqueOwners = Array.from(uniqueOwnersMap.entries()).map(([id, name]) => ({ id, name }))

    const toggleSelectKey = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setSelectedKeyIds(prev =>
            prev.includes(id) ? prev.filter(kId => kId !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedKeyIds.length === filteredKeys.length && filteredKeys.length > 0) {
            setSelectedKeyIds([])
        } else {
            setSelectedKeyIds(filteredKeys.map(k => k.id))
        }
    }

    const handleBulkTakeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedKeyIds.length === 0 || !bulkPurpose.trim()) return
        setBulkLoading(true)
        setError(null)
        try {
            await keyAPI.bulkTake(selectedKeyIds, bulkPurpose)
            setSelectedKeyIds([])
            setBulkPurpose("")
            setShowBulkTakeModal(false)
            fetchKeys()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setBulkLoading(false)
        }
    }

    const handleTakeAllOwnerKeys = () => {
        if (ownerFilter === "all") {
            setSelectedKeyIds(filteredKeys.map(k => k.id))
        } else {
            const ownerKeyIds = filteredKeys.map(k => k.id)
            setSelectedKeyIds(ownerKeyIds)
        }
        setShowBulkTakeModal(true)
    }

    if (!currentUser) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading dashboard...</div>

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="bg-card/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5 tracking-tight">
                                <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400">
                                    <KeyIcon className="w-5 h-5" />
                                </div>
                                Key Management
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Take, search, and track department room keys</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="rounded-xl border-border bg-card hover:bg-accent"
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </Button>
                        <NotificationDropdown />
                        {canManage && (
                            <Button
                                variant="default"
                                onClick={() => { setSelectedKey(null); setShowActionModal(true) }}
                                className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-medium shadow-md shadow-blue-500/20 rounded-xl"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Key
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">

                {/* Search & Filter Toolbar */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search keys by code, description, or location..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 bg-background border-border/70 rounded-xl h-11 focus:border-blue-500 transition-all text-sm"
                            />
                        </div>

                        {/* Location Filter */}
                        <div className="w-full md:w-60">
                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger className="bg-background border-border/70 rounded-xl h-11 text-sm">
                                    <MapPin className="w-4 h-4 mr-2 text-blue-500 dark:text-sky-400 shrink-0" />
                                    <SelectValue placeholder="Filter by Location" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map(loc => (
                                        <SelectItem key={loc} value={loc}>
                                            {loc}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Owner Filter */}
                        <div className="w-full md:w-60">
                            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                                <SelectTrigger className="bg-background border-border/70 rounded-xl h-11 text-sm">
                                    <UserCheck className="w-4 h-4 mr-2 text-amber-500 shrink-0" />
                                    <SelectValue placeholder="Filter by Owner" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Owners</SelectItem>
                                    {uniqueOwners.map((owner) => (
                                        <SelectItem key={owner.id} value={owner.id}>
                                            {owner.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Batch Selection Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2.5 text-xs font-semibold text-foreground hover:text-blue-600 dark:hover:text-sky-400 transition-colors focus:outline-none py-1.5 px-3 rounded-lg bg-muted/50 border border-border/50"
                            >
                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${selectedKeyIds.length > 0 && selectedKeyIds.length === filteredKeys.length
                                    ? "bg-blue-600 dark:bg-sky-500 border-blue-600 dark:border-sky-500 text-white"
                                    : selectedKeyIds.length > 0
                                        ? "bg-blue-600/20 border-blue-600 text-blue-600 dark:text-sky-400"
                                        : "border-muted-foreground/40 bg-background"
                                    }`}>
                                    {selectedKeyIds.length > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span>{selectedKeyIds.length > 0 ? `Selected (${selectedKeyIds.length})` : "Select All"}</span>
                            </button>

                            {selectedKeyIds.length > 0 && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 text-[11px] font-medium px-2.5 py-1">
                                    {selectedKeyIds.length} of {filteredKeys.length} keys selected
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {ownerFilter !== "all" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTakeAllOwnerKeys}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs rounded-xl h-9 font-semibold"
                                >
                                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                                    Take All ({filteredKeys.length}) Keys
                                </Button>
                            )}

                            <Button
                                disabled={selectedKeyIds.length === 0}
                                onClick={() => setShowBulkTakeModal(true)}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 rounded-xl h-9 disabled:opacity-40"
                            >
                                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                                Take Selected ({selectedKeyIds.length})
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-sky-400 mb-4" />
                        <p className="text-sm font-medium">Loading room keys...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredKeys.map(key => {
                                const isSelected = selectedKeyIds.includes(key.id)
                                return (
                                    <KeyCard
                                        key={key.id}
                                        item={key}
                                        isSelected={isSelected}
                                        canManage={canManage}
                                        onToggleSelect={(e) => toggleSelectKey(key.id, e)}
                                        onClick={() => { setSelectedKey(key); setShowDetailModal(true) }}
                                        onEdit={() => { setSelectedKey(key); setShowActionModal(true) }}
                                        onDelete={() => handleDelete(key)}
                                    />
                                )
                            })}
                        </div>

                        {filteredKeys.length === 0 && (
                            <div className="text-center py-20 bg-card/40 border border-border/60 rounded-2xl">
                                <KeyIcon className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                                <h3 className="text-base font-semibold text-foreground mb-1">No matching keys found</h3>
                                <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                                    {searchQuery || locationFilter !== "all" || ownerFilter !== "all"
                                        ? "Try adjusting your filters or search terms."
                                        : "No keys registered in the system yet."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bulk Take Modal */}
            {showBulkTakeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkTakeModal(false)} />
                    <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <LogIn className="w-5 h-5 text-blue-500 dark:text-sky-400" />
                                Take {selectedKeyIds.length} Selected Key(s)
                            </h2>
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowBulkTakeModal(false)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleBulkTakeSubmit} className="space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                You are taking <strong className="text-foreground">{selectedKeyIds.length} key(s)</strong>. Ownership will be transferred to your name immediately.
                            </p>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Purpose / Notes <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    required
                                    value={bulkPurpose}
                                    onChange={e => setBulkPurpose(e.target.value)}
                                    placeholder="e.g. Taking keys for lab session / class..."
                                    className="bg-background border-border rounded-xl"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowBulkTakeModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-semibold shadow-lg shadow-blue-500/20" disabled={bulkLoading}>
                                    {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                                    Confirm Take ({selectedKeyIds.length})
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modals */}
            <KeyActionModal
                isOpen={showActionModal}
                onClose={() => { setShowActionModal(false); setSelectedKey(null) }}
                onSaved={fetchKeys}
                editKey={selectedKey}
            />
            <KeyHistoryModal
                isOpen={showHistoryModal}
                onClose={() => { setShowHistoryModal(false); setSelectedKey(null) }}
                targetKey={selectedKey}
            />
            <KeyDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedKey(null) }}
                onRefresh={fetchKeys}
                targetKey={selectedKey}
                currentUser={currentUser}
            />
            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                confirmText="Delete"
            />
        </div>
    )
}

function KeyCard({ item, isSelected, canManage, onToggleSelect, onClick, onEdit, onDelete }: {
    item: Key,
    isSelected: boolean,
    canManage: boolean,
    onToggleSelect: (e: React.MouseEvent) => void,
    onClick: () => void,
    onEdit: () => void,
    onDelete: () => void,
}) {
    const isCheckedOut = !!item.current_checkout
    const currentHolder = item.current_checkout?.user?.name

    return (
        <Card
            className={`bg-card border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group relative rounded-2xl ${isSelected
                ? "ring-2 ring-blue-600 dark:ring-sky-400 border-blue-600 dark:border-sky-400 bg-blue-50/50 dark:bg-sky-950/20"
                : "border-border/80 hover:border-blue-500/40 dark:hover:border-sky-500/40"
                }`}
            onClick={onClick}
        >
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                    {/* Top Row: Checkbox, Key Code, Location & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* High contrast custom checkbox */}
                            <button
                                type="button"
                                onClick={onToggleSelect}
                                className="mt-0.5 shrink-0 focus:outline-none"
                                title={isSelected ? "Unselect key" : "Select key"}
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isSelected
                                    ? "bg-blue-600 dark:bg-sky-500 border-blue-600 dark:border-sky-500 text-white shadow-sm shadow-blue-500/30"
                                    : "border-muted-foreground/40 bg-background hover:border-blue-500/60"
                                    }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                                </div>
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-extrabold text-xl text-foreground tracking-tight group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors truncate">
                                        {item.code}
                                    </h3>
                                    {item.location && (
                                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/80 bg-muted/60 text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                                            <MapPin className="w-2.5 h-2.5 text-blue-500 dark:text-sky-400" />
                                            {item.location}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold px-2.5 py-0.5 shrink-0 border rounded-full flex items-center gap-1 ${isCheckedOut
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                }`}
                        >
                            {isCheckedOut ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {isCheckedOut ? "In Use" : "Available"}
                        </Badge>
                    </div>

                    {/* Original Holder Badge (if assigned) */}
                    {item.assigned_user && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40">
                            <BookOpen className="w-3 h-3 text-blue-500 dark:text-sky-400 shrink-0" />
                            <span className="truncate">Original Holder: <strong className="text-foreground font-semibold">{item.assigned_user.name}</strong></span>
                        </div>
                    )}

                    {/* Current Owner Banner (if held) */}
                    {isCheckedOut && (
                        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-xl p-3 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">Current Owner</p>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {currentHolder?.charAt(0) ?? "?"}
                                </div>
                                <span className="text-xs font-semibold text-foreground truncate">{currentHolder ?? "Unknown User"}</span>
                            </div>
                            {item.current_checkout?.purpose && (
                                <p className="text-[11px] text-muted-foreground pt-0.5 italic line-clamp-1">Purpose: {item.current_checkout.purpose}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action Row */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-blue-600 dark:text-sky-400 font-semibold group-hover:underline flex items-center gap-1">
                        <LogIn className="w-3 h-3" />
                        {isCheckedOut ? "Take From Holder" : "Take Key"}
                    </span>

                    {canManage && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                                onClick={(e) => { e.stopPropagation(); onEdit() }}
                                title="Edit Key"
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); onDelete() }}
                                title="Delete Key"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function KeyManagementWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <DashboardSidebarWrapper>
                <KeyManagementPage />
            </DashboardSidebarWrapper>
        </RoleProtectedRoute>
    )
}
