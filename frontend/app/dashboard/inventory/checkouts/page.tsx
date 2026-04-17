"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Package, Clock, CheckCircle, Search, ChevronLeft, ChevronRight,
    Edit, Trash2, RotateCcw, AlertTriangle, History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    checkoutAPI, getStoredUser, formatAPIError, hasAnyRole,
    type EquipmentCheckout, type User
} from "@/lib/api"

function CheckoutsPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [tab, setTab] = useState<"active" | "returned" | "trashed">("active")
    const [checkouts, setCheckouts] = useState<EquipmentCheckout[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string;
        action: () => void; variant?: "default" | "destructive"
    }>({ isOpen: false, title: "", description: "", action: () => { } })

    const canManage = hasAnyRole(["admin", "coordinator", "supervisor"])
    const isAdmin = hasAnyRole(["admin"])

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchCheckouts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params: Record<string, string | number> = { page: currentPage, per_page: 20 }
            if (searchQuery) params.search = searchQuery
            if (tab === "active") params.status = "active"
            if (tab === "returned") params.status = "returned"

            let res
            if (tab === "trashed") {
                res = await checkoutAPI.trashed(params)
            } else {
                res = await checkoutAPI.list(params)
            }
            setCheckouts(res.data)
            setTotalPages(res.meta?.last_page ?? 1)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [tab, currentPage, searchQuery])

    useEffect(() => { if (currentUser) fetchCheckouts() }, [currentUser, fetchCheckouts])

    const confirmAction = (title: string, description: string, action: () => void, variant: "default" | "destructive" = "default") => {
        setConfirmDialog({ isOpen: true, title, description, action, variant })
    }

    const handleSoftDelete = (id: string) => confirmAction(
        "Delete Checkout Record",
        "This will soft-delete the record and free the equipment if it was active.",
        async () => { try { await checkoutAPI.delete(id); fetchCheckouts() } catch (err) { setError(formatAPIError(err)) } },
        "destructive"
    )

    const handleRestore = (id: string) => confirmAction(
        "Restore Checkout Record",
        "This will restore the record. If it was an active checkout, the equipment will be marked as checked out again.",
        async () => { try { await checkoutAPI.restore(id); fetchCheckouts() } catch (err) { setError(formatAPIError(err)) } }
    )

    const handleForceDelete = (id: string) => confirmAction(
        "Permanently Delete",
        "This action cannot be undone. The record will be permanently removed.",
        async () => { try { await checkoutAPI.forceDelete(id); fetchCheckouts() } catch (err) { setError(formatAPIError(err)) } },
        "destructive"
    )

    const fmt = (dt: string) => new Date(dt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
    })

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <>
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                            <History className="w-6 h-6 text-primary" />
                            Checkout Records
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">All equipment check-in/out history</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/inventory")}>
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to Inventory
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-4 sm:p-6">
                {/* Tabs + Search */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
                    <div className="flex items-center bg-card/80 border border-border rounded-lg p-1 gap-1">
                        {(["active", "returned", "trashed"] as const).map(t => (
                            <button key={t} onClick={() => { setTab(t); setCurrentPage(1) }}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by equipment, user, event..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                            className="pl-10 bg-card/80 border-border w-72"
                        />
                    </div>
                </div>

                {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-12 text-muted-foreground">Loading records...</div>
                ) : (
                    <>
                        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Equipment</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Event Note</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Checked Out</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Returned</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                            {canManage && (
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {checkouts.map(c => (
                                            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground">{c.equipment?.name ?? "—"}</div>
                                                    <div className="text-xs font-mono text-muted-foreground">{c.equipment?.barcode}</div>
                                                </td>
                                                <td className="px-4 py-3 text-foreground">{c.user?.name ?? "—"}</td>
                                                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={c.event_note}>{c.event_note}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(c.checked_out_at)}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {c.returned_at ? fmt(c.returned_at) : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.deleted_at ? (
                                                        <Badge className="bg-muted text-muted-foreground text-xs">Deleted</Badge>
                                                    ) : c.returned_at ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Returned</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Active</Badge>
                                                    )}
                                                </td>
                                                {canManage && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-1">
                                                            {tab !== "trashed" && (
                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                                    title="Soft delete" onClick={() => handleSoftDelete(c.id)}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            {tab === "trashed" && (
                                                                <>
                                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10"
                                                                        title="Restore" onClick={() => handleRestore(c.id)}>
                                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    {isAdmin && (
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                                            title="Delete permanently" onClick={() => handleForceDelete(c.id)}>
                                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {checkouts.length === 0 && (
                            <div className="text-center py-12">
                                <History className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground">No records found.</p>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-6">
                                <Button variant="outline" size="sm" disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                <Button variant="outline" size="sm" disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                confirmText={confirmDialog.variant === "destructive" ? "Delete" : "Confirm"}
            />
        </>
    )
}

export default function CheckoutsPageWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <CheckoutsPage />
        </RoleProtectedRoute>
    )
}
