"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, RefreshCw, Package, History, Edit2, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, formatAPIError } from "@/lib/api"

interface MarketingEquipment {
    id: number
    name: string
    description?: string
    quantity: number
    status: 'available' | 'currently_using' | 'maintenance' | 'retired'
    deleted_at?: string | null
}

interface MarketingEquipmentPageProps {
    readonly?: boolean                // if true → hide add/edit/delete (for ambassadors viewing)
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    available: { label: 'Available', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
    currently_using: { label: 'Currently Using', className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
    maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
    retired: { label: 'Retired', className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400' },
}

const EMPTY_FORM = { name: '', description: '', quantity: 1 }

export function MarketingEquipmentPage({ readonly = false }: MarketingEquipmentPageProps) {
    const [equipment, setEquipment] = useState<MarketingEquipment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedEquipment, setSelectedEquipment] = useState<MarketingEquipment | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editTarget, setEditTarget] = useState<MarketingEquipment | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const fetchEquipment = useCallback(async () => {
        setLoading(true)
        try {
            const queryParams = new URLSearchParams()
            if (search) queryParams.append('search', search)
            queryParams.append('per_page', '50')

            const res: any = await api.get(`/marketing-equipment?${queryParams.toString()}`)
            setEquipment(res.data.data || res.data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }, [search])

    useEffect(() => { fetchEquipment() }, [fetchEquipment])

    const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
    const openEdit = (eq: MarketingEquipment) => {
        setEditTarget(eq)
        setForm({ name: eq.name, description: eq.description || '', quantity: eq.quantity })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required'); return }
        setSaving(true); setError(null)
        try {
            if (editTarget) {
                await api.put(`/marketing-equipment/${editTarget.id}`, form)
            } else {
                await api.post('/marketing-equipment', form)
            }
            setShowForm(false)
            fetchEquipment()
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to save')
        } finally { setSaving(false) }
    }

    const handleDelete = async (eq: MarketingEquipment) => {
        if (!confirm(`Delete "${eq.name}"?`)) return
        try {
            await api.delete(`/marketing-equipment/${eq.id}`)
            fetchEquipment()
        } catch { /* silent */ }
    }

    const openHistory = async (eq: MarketingEquipment) => {
        setSelectedEquipment(eq)
        setShowHistory(true)
        setHistoryLoading(true)
        try {
            const res: any = await api.get(`/marketing-equipment/${eq.id}/history`)
            setHistory(res.data.data || res.data || [])
        } catch { setHistory([]) }
        finally { setHistoryLoading(false) }
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search equipment..."
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchEquipment} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {!readonly && (
                        <Button size="sm" onClick={openCreate} className="bg-pink-600 hover:bg-pink-700 text-white">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Equipment
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">Description</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground">Qty</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                        ) : equipment.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No equipment found.</td></tr>
                        ) : equipment.map(eq => (
                            <tr key={eq.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                        {eq.name}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-xs">
                                    {eq.description || '—'}
                                </td>
                                <td className="px-4 py-3 text-center font-mono">{eq.quantity}</td>
                                <td className="px-4 py-3 text-center">
                                    <Badge className={`text-xs border ${STATUS_CONFIG[eq.status]?.className || ''}`}>
                                        {STATUS_CONFIG[eq.status]?.label || eq.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistory(eq)}>
                                            <History className="w-3.5 h-3.5" />
                                        </Button>
                                        {!readonly && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(eq)}>
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(eq)}>
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

            {/* Create/Edit Form Dialog */}
            <Dialog open={showForm} onOpenChange={open => !open && setShowForm(false)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Edit Equipment' : 'Add Marketing Equipment'}</DialogTitle>
                        <DialogDescription>
                            {editTarget ? 'Update equipment details.' : 'Add a new item to the marketing equipment inventory.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</div>}
                        <div className="space-y-1.5">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Camera, Tripod, Drone..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes..." rows={2} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Quantity *</Label>
                            <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
                            {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Equipment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={showHistory} onOpenChange={open => !open && setShowHistory(false)}>
                <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-pink-500" />
                                Equipment History — {selectedEquipment?.name}
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    {historyLoading ? (
                        <p className="text-center text-muted-foreground py-6">Loading history...</p>
                    ) : history.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No history recorded yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded border border-border bg-muted/30 text-sm">
                                    <div>
                                        <p className="font-medium text-foreground">{h.assignment_name || h.event_name || 'Assignment'}</p>
                                        <p className="text-xs text-muted-foreground">{h.event_start_datetime ? new Date(h.event_start_datetime).toLocaleDateString() : ''}</p>
                                    </div>
                                    <Badge className={`text-xs border ${h.currently_using ? STATUS_CONFIG.currently_using.className : STATUS_CONFIG.available.className}`}>
                                        {h.currently_using ? 'In Use' : 'Returned'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowHistory(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
