"use client"

import { useState, useEffect } from "react"
import { X, History, Clock, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { equipmentAPI, cableAPI, formatAPIError, type Equipment, type Cable, type EquipmentCheckout, type CableCheckout } from "@/lib/api"

interface Props {
    isOpen: boolean
    onClose: () => void
    equipment: Equipment | null
    cable?: Cable | null
}

export default function EquipmentHistoryModal({ isOpen, onClose, equipment, cable }: Props) {
    const [history, setHistory] = useState<(EquipmentCheckout | CableCheckout)[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            if (equipment) {
                setLoading(true)
                setError(null)
                equipmentAPI.history(equipment.id)
                    .then(res => setHistory(res.history))
                    .catch(err => setError(formatAPIError(err)))
                    .finally(() => setLoading(false))
            } else if (cable) {
                setLoading(true)
                setError(null)
                cableAPI.history(cable.id)
                    .then(res => setHistory(res.history))
                    .catch(err => setError(formatAPIError(err)))
                    .finally(() => setLoading(false))
            }
        }
    }, [isOpen, equipment, cable])

    if (!isOpen || (!equipment && !cable)) return null
    const displayItem = equipment || cable!

    const fmt = (dt: string) => new Date(dt).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">Checkout History</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">{displayItem.name} · <span className="font-mono">{displayItem.barcode}</span></p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-4">
                    {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {!loading && !error && history.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-8">No checkout history yet.</p>
                    )}
                    {!loading && !error && history.length > 0 && (
                        <div className="space-y-3">
                            {history.map(c => (
                                <div key={c.id} className={`rounded-lg border p-3 ${c.returned_at
                                    ? "bg-card border-border"
                                    : "bg-amber-500/5 border-amber-500/20"
                                    }`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">{c.user?.name ?? "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground truncate" title={c.event_note}>
                                                {'quantity_checked_out' in c && <span className="font-bold mr-1">[{c.quantity_checked_out} pcs]</span>}
                                                {c.event_note}
                                            </p>
                                        </div>
                                        {c.returned_at
                                            ? <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0"><CheckCircle className="w-3 h-3" />Returned</span>
                                            : <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0"><Clock className="w-3 h-3" />Active</span>
                                        }
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                        <p>Checked out: {fmt(c.checked_out_at)}</p>
                                        {c.returned_at && <p>Returned: {fmt(c.returned_at)}</p>}
                                        {c.return_note && <p>Note: {c.return_note}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
