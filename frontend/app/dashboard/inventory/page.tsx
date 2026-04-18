"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Package, Search, Plus, Edit, Trash2, RotateCcw, Clock, QrCode,
    CheckCircle, AlertCircle, Wrench, History, ChevronLeft, ChevronRight,
    LayoutGrid, List, MapPin, Box, Sun, Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import BarcodeScannerModal from "@/components/BarcodeScannerModal"
import AddEquipmentModal from "@/components/AddEquipmentModal"
import AddCableModal from "@/components/AddCableModal"
import EquipmentHistoryModal from "@/components/EquipmentHistoryModal"
import EquipmentDetailModal from "@/components/EquipmentDetailModal"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    equipmentAPI, cableAPI, getStoredUser, formatAPIError, hasAnyRole,
    type Equipment, type Cable, type User
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
    const [cables, setCables] = useState<Cable[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [locationFilter, setLocationFilter] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const [viewMode, setViewMode] = useState<"grid" | "list">("list")
    const [itemType, setItemType] = useState<"equipment" | "cables">("equipment")

    const [showScannerModal, setShowScannerModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showAddCableModal, setShowAddCableModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const { theme, setTheme } = useTheme()
    const [locations, setLocations] = useState<string[]>([])
    const [selectedItem, setSelectedItem] = useState<Equipment | Cable | null>(null)
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

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params: Record<string, string | number> = { page: currentPage, per_page: 15 }
            if (searchQuery) params.search = searchQuery
            if (categoryFilter) params.category = categoryFilter
            if (locationFilter) params.location = locationFilter

            if (itemType === "equipment") {
                if (statusFilter) params.status = statusFilter
                const res = await equipmentAPI.list(params)
                setEquipment(res.data)
                setTotalPages(res.meta?.last_page ?? 1)
            } else {
                const res = await cableAPI.list(params)
                setCables(res.data)
                setTotalPages(res.meta?.last_page ?? 1)
            }
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchQuery, statusFilter, categoryFilter, itemType])

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const [eRes, cRes] = await Promise.all([
                    equipmentAPI.locations(),
                    cableAPI.locations()
                ])
                const combined = Array.from(new Set([...eRes.locations, ...cRes.locations])).sort()
                setLocations(combined)
            } catch (err) { console.error("Failed to fetch locations", err) }
        }
        if (currentUser) {
            fetchItems()
            fetchLocations()
        }
    }, [currentUser, fetchItems])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setCurrentPage(1); fetchItems() }, 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const handleDelete = (item: Equipment | Cable) => {
        setConfirmDialog({
            isOpen: true, variant: "destructive",
            title: `Delete ${itemType === "equipment" ? "Equipment" : "Cable"}`,
            description: `Are you sure you want to delete "${item.name}"?`,
            action: async () => {
                try {
                    if (itemType === "equipment") {
                        await equipmentAPI.delete(item.id)
                    } else {
                        await cableAPI.delete(item.id)
                    }
                    fetchItems()
                } catch (err) { setError(formatAPIError(err)) }
            }
        })
    }

    const goBack = () => {
        if (!currentUser) return
        const dashPath = hasAnyRole(["admin", "coordinator", "supervisor", "student"])
            ? `/dashboard/${currentUser.role}`
            : "/dashboard"
        router.push(dashPath)
    }

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <>
            {/* Header */}
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                <Box className="w-6 h-6 text-primary dark:text-white" />
                                Inventory Management
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Track and manage media team resources</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="mr-2"
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                        <NotificationDropdown />
                        <Button
                            onClick={() => setShowScannerModal(true)}
                            className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground hover:shadow-lg transition-all"
                        >
                            <QrCode className="w-4 h-4 mr-2" />
                            Scan Barcode
                        </Button>
                        {canManage && (
                            <Button variant="outline" onClick={() => itemType === "equipment" ? setShowAddModal(true) : setShowAddCableModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add {itemType === "equipment" ? "Equipment" : "Cable"}
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24">
                {/* Controls */}
                <div className="flex flex-col gap-6 mb-8">
                    {/* Top Row: Type and View Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
                            <Button
                                variant={itemType === "equipment" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => { setItemType("equipment"); setCurrentPage(1) }}
                                className="h-8 px-4"
                            >
                                Equipment
                            </Button>
                            <Button
                                variant={itemType === "cables" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => { setItemType("cables"); setCurrentPage(1) }}
                                className="h-8 px-4"
                            >
                                Cables
                            </Button>
                        </div>

                        <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
                            <Button
                                variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className="h-8 px-3"
                            >
                                <List className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className="h-8 px-3"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${itemType}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 bg-card/80 border-border"
                            />
                        </div>
                        <div className="relative w-full md:w-48">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={locationFilter}
                                onChange={e => { setLocationFilter(e.target.value); setCurrentPage(1) }}
                                className="w-full pl-9 pr-3 py-2 bg-card/80 border border-border rounded-md text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">All Locations</option>
                                {locations.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        {itemType === "equipment" && (
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
                        )}
                        <select
                            value={categoryFilter}
                            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
                            className="px-3 py-2 rounded-md border border-border bg-card/80 text-foreground text-sm"
                        >
                            <option value="">All Categories</option>
                            {(itemType === "equipment"
                                ? ["Audio Indoor", "Audio Outdoor", "Livestream", "Lighting", "Other"]
                                : ["XLR", "HDMI", "SDI", "USB", "Power", "Other"]
                            ).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {canManage && itemType === "equipment" && (
                            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/inventory/checkouts")}
                                className="text-muted-foreground hover:text-foreground">
                                <History className="w-4 h-4 mr-1" />
                                Checkout Records
                            </Button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        Loading {itemType}...
                    </div>
                ) : (
                    <>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {itemType === "equipment"
                                    ? equipment.map(item => <EquipmentCard key={item.id} item={item} canManage={canManage} onAction={() => { setSelectedItem(item); setShowDetailModal(true) }} onDelete={() => handleDelete(item)} onHistory={() => { setSelectedItem(item); setShowHistoryModal(true) }} onEdit={() => { setSelectedItem(item); setShowAddModal(true) }} />)
                                    : cables.map(item => <CableCard key={item.id} item={item} canManage={canManage} onAction={() => { setSelectedItem(item); setShowDetailModal(true) }} onDelete={() => handleDelete(item)} onHistory={() => { setSelectedItem(item); setShowHistoryModal(true) }} onEdit={() => { setSelectedItem(item); setShowAddCableModal(true) }} />)
                                }
                            </div>
                        ) : (
                            <div className="bg-card/90 backdrop-blur-xl rounded-lg border border-border overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Barcode</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">{itemType === "equipment" ? "Status" : "Amount"}</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {(itemType === "equipment" ? equipment : cables).map(item => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setSelectedItem(item); setShowDetailModal(true) }}>
                                                <td className="px-4 py-3 font-medium">{item.name} {itemType === "cables" && `(${(item as Cable).length})`}</td>
                                                <td className="px-4 py-3 font-mono text-xs">{item.barcode}</td>
                                                <td className="px-4 py-3">{item.category}</td>
                                                <td className="px-4 py-3">📍 {item.location}</td>
                                                <td className="px-4 py-3">
                                                    {itemType === "equipment" ? (
                                                        <Badge className={`text-[10px] border ${(STATUS_CONFIG[(item as Equipment).status]).className}`}>
                                                            {(item as Equipment).status}
                                                        </Badge>
                                                    ) : (
                                                        <span className={(item as Cable).amount === 0 ? "text-destructive font-semibold" : ""}>
                                                            {(item as Cable).amount} available
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedItem(item); setShowHistoryModal(true) }}>
                                                            <History className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {canManage && (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedItem(item); itemType === "equipment" ? setShowAddModal(true) : setShowAddCableModal(true) }}>
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {(itemType === "equipment" ? equipment.length : cables.length) === 0 && !loading && (
                            <div className="text-center py-24">
                                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No {itemType} found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {searchQuery || statusFilter || categoryFilter ? "Try adjusting your filters." : "Start by adding some items."}
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
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
                onClose={() => { setShowScannerModal(false); fetchItems() }}
            />
            <AddEquipmentModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setSelectedItem(null) }}
                onSaved={fetchItems}
                editEquipment={selectedItem as Equipment}
            />
            {/* Cable Modals (Need to be created) */}
            <AddCableModal
                isOpen={showAddCableModal}
                onClose={() => { setShowAddCableModal(false); setSelectedItem(null) }}
                onSaved={fetchItems}
                editCable={selectedItem as Cable}
            />
            <EquipmentHistoryModal
                isOpen={showHistoryModal}
                onClose={() => { setShowHistoryModal(false); setSelectedItem(null) }}
                equipment={itemType === "equipment" ? selectedItem as Equipment : null}
                cable={itemType === "cables" ? selectedItem as Cable : null}
            />
            <EquipmentDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedItem(null) }}
                equipment={itemType === "equipment" ? selectedItem as Equipment : null}
                cable={itemType === "cables" ? selectedItem as Cable : null}
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

// Sub-components for better organization
function EquipmentCard({ item, canManage, onAction, onDelete, onHistory, onEdit }: { item: Equipment, canManage: boolean, onAction: () => void, onDelete: () => void, onHistory: () => void, onEdit: () => void }) {
    const statusCfg = STATUS_CONFIG[item.status]
    const condCfg = CONDITION_CONFIG[item.condition]
    const StatusIcon = statusCfg.icon
    return (
        <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group"
            onClick={onAction}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 border ${statusCfg.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusCfg.label}
                    </Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-mono bg-muted/30 px-2 py-1 rounded text-foreground/70">{item.barcode}</p>
                    <p className="text-xs text-muted-foreground">📍 {item.location}</p>
                </div>
                <Badge className={`text-[10px] ${condCfg.className}`}>{condCfg.label} condition</Badge>
                {item.status === "checked_out" && item.current_checkout && (
                    <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Held by: </span>
                        <span className="font-medium text-foreground">{item.current_checkout.user?.name ?? "—"}</span>
                    </div>
                )}
                <div className="flex gap-1 pt-1 border-t border-border" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] flex-1" onClick={onHistory}>
                        <History className="w-3 h-3 mr-1" />History
                    </Button>
                    {canManage && (
                        <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={onEdit}>
                                <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={onDelete}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function CableCard({ item, canManage, onAction, onDelete, onHistory, onEdit }: { item: Cable, canManage: boolean, onAction: () => void, onDelete: () => void, onHistory: () => void, onEdit: () => void }) {
    const condCfg = CONDITION_CONFIG[item.condition]
    return (
        <Card className="bg-card/90 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group"
            onClick={onAction}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.category} • {item.length}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${item.amount === 0 ? "border-destructive text-destructive" : "border-primary/30 text-primary"}`}>
                        {item.amount} available
                    </Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-mono bg-muted/30 px-2 py-1 rounded text-foreground/70">{item.barcode}</p>
                    <p className="text-xs text-muted-foreground">📍 {item.location}</p>
                </div>
                <Badge className={`text-[10px] ${condCfg.className}`}>{condCfg.label} condition</Badge>

                <div className="flex gap-1 pt-1 border-t border-border" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] flex-1" onClick={onHistory}>
                        <History className="w-3 h-3 mr-1" />History
                    </Button>
                    {canManage && (
                        <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={onEdit}>
                                <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={onDelete}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function InventoryPageWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <InventoryPage />
        </RoleProtectedRoute>
    )
}
