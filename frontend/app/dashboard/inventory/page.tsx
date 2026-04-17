"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Package, Search, Plus, Edit, Trash2, RotateCcw, Clock, QrCode,
    CheckCircle, AlertCircle, Wrench, History, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import BarcodeScannerModal from "@/components/BarcodeScannerModal"
import AddEquipmentModal from "@/components/AddEquipmentModal"
import EquipmentHistoryModal from "@/components/EquipmentHistoryModal"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    equipmentAPI, getStoredUser, formatAPIError, hasAnyRole,
    type Equipment, type User
} from "@/lib/api"

const STATUS_CONFIG = {
    available: { label: "Available", icon: CheckCircle, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    checked_out: { label: "Checked Out", icon: Clock, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    maintenance: { label: "Maintenance", icon: Wrench, className: "bg-red-500/20 text-red-400 border-red-500/30" },
}

const CONDITION_CONFIG = {
    good: { label: "Good", className: "bg-emerald-500/10 text-emerald-400" },
    fair: { label: "Fair", className: "bg-amber-500/10 text-amber-400" },
    poor: { label: "Poor", className: "bg-red-500/10 text-red-400" },
}

function InventoryPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [equipment, setEquipment] = useState<Equipment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const [showScannerModal, setShowScannerModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string;
        action: () => void; variant?: "default" | "destructive"
    }>({ isOpen: false, title: "", description: "", action: () => { } })

    const canManage = hasAnyRole(["admin", "coordinator", "supervisor"])

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchEquipment = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params: Record<string, string | number> = { page: currentPage, per_page: 15 }
            if (searchQuery) params.search = searchQuery
            if (statusFilter) params.status = statusFilter
            if (categoryFilter) params.category = categoryFilter
            const res = await equipmentAPI.list(params)
            setEquipment(res.data)
            setTotalPages(res.meta?.last_page ?? 1)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchQuery, statusFilter, categoryFilter])

    useEffect(() => { if (currentUser) fetchEquipment() }, [currentUser, fetchEquipment])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setCurrentPage(1); fetchEquipment() }, 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const handleDelete = (item: Equipment) => {
        setConfirmDialog({
            isOpen: true, variant: "destructive",
            title: "Delete Equipment",
            description: `Are you sure you want to delete "${item.name}"? It will be moved to trash.`,
            action: async () => {
                try {
                    await equipmentAPI.delete(item.id)
                    fetchEquipment()
                } catch (err) { setError(formatAPIError(err)) }
            }
        })
    }

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <>
            {/* Header */}
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" />
                            Equipment Inventory
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Track and manage media team equipment</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                        <Button
                            onClick={() => setShowScannerModal(true)}
                            className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground hover:shadow-lg transition-all"
                        >
                            <QrCode className="w-4 h-4 mr-2" />
                            Scan Barcode
                        </Button>
                        {canManage && (
                            <Button variant="outline" onClick={() => setShowAddModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Equipment
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-auto p-4 sm:p-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, barcode, category..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-card/80 border-border"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                        className="px-3 py-2 rounded-md border border-border bg-card/80 text-foreground text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="available">Available</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                    <select
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
                        className="px-3 py-2 rounded-md border border-border bg-card/80 text-foreground text-sm"
                    >
                        <option value="">All Categories</option>
                        {["Camera", "Lens", "Tripod", "Audio", "Lighting", "Other"].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/inventory/checkouts")}
                            className="text-muted-foreground hover:text-foreground">
                            <History className="w-4 h-4 mr-1" />
                            Checkout Records
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12 text-muted-foreground">Loading equipment...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {equipment.map(item => {
                                const statusCfg = STATUS_CONFIG[item.status]
                                const condCfg = CONDITION_CONFIG[item.condition]
                                const StatusIcon = statusCfg.icon
                                return (
                                    <Card key={item.id}
                                        className="bg-card/90 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all">
                                        <CardContent className="p-4 space-y-3">
                                            {/* Name + Status */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                                                </div>
                                                <Badge className={`text-xs shrink-0 border ${statusCfg.className}`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {statusCfg.label}
                                                </Badge>
                                            </div>

                                            {/* Barcode + Location */}
                                            <div className="space-y-1">
                                                <p className="text-xs font-mono bg-muted/30 px-2 py-1 rounded text-foreground/70">{item.barcode}</p>
                                                <p className="text-xs text-muted-foreground">📍 {item.location}</p>
                                            </div>

                                            {/* Condition */}
                                            <Badge className={`text-xs ${condCfg.className}`}>{condCfg.label} condition</Badge>

                                            {/* Held by */}
                                            {item.status === "checked_out" && item.current_checkout && (
                                                <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
                                                    <span className="text-muted-foreground">Held by: </span>
                                                    <span className="font-medium text-foreground">{item.current_checkout.user?.name ?? "—"}</span>
                                                    <p className="text-muted-foreground mt-0.5 truncate" title={item.current_checkout.event_note}>
                                                        {item.current_checkout.event_note}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-1 pt-1 border-t border-border">
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1"
                                                    onClick={() => { setSelectedEquipment(item); setShowHistoryModal(true) }}>
                                                    <History className="w-3 h-3 mr-1" />History
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                                            onClick={() => { setSelectedEquipment(item); setShowAddModal(true) }}>
                                                            <Edit className="w-3 h-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm"
                                                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(item)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {equipment.length === 0 && !loading && (
                            <div className="text-center py-16">
                                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No equipment found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {searchQuery || statusFilter ? "Try adjusting your filters." : "Add some equipment to get started."}
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
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

            {/* Modals */}
            <BarcodeScannerModal
                isOpen={showScannerModal}
                onClose={() => { setShowScannerModal(false); fetchEquipment() }}
            />
            <AddEquipmentModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setSelectedEquipment(null) }}
                onSaved={fetchEquipment}
                editEquipment={selectedEquipment}
            />
            <EquipmentHistoryModal
                isOpen={showHistoryModal}
                onClose={() => { setShowHistoryModal(false); setSelectedEquipment(null) }}
                equipment={selectedEquipment}
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
        </>
    )
}

export default function InventoryPageWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <InventoryPage />
        </RoleProtectedRoute>
    )
}
