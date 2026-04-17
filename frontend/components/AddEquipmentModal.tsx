"use client"

import { useState, useEffect } from "react"
import { X, Package, Loader2, Printer } from "lucide-react"
import Barcode from "react-barcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { equipmentAPI, formatAPIError, type Equipment } from "@/lib/api"

interface Props {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    editEquipment?: Equipment | null
}

export default function AddEquipmentModal({ isOpen, onClose, onSaved, editEquipment }: Props) {
    const isEdit = !!editEquipment
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdBarcode, setCreatedBarcode] = useState<string | null>(null)

    const [form, setForm] = useState({
        name: "", category: "", location: "", purchase_date: "", condition: "good",
    })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setCreatedBarcode(null)
            if (editEquipment) {
                setForm({
                    name: editEquipment.name,
                    category: editEquipment.category,
                    location: editEquipment.location,
                    purchase_date: editEquipment.purchase_date ?? "",
                    condition: editEquipment.condition,
                })
            } else {
                setForm({ name: "", category: "", location: "", purchase_date: "", condition: "good" })
            }
        }
    }, [isOpen, editEquipment])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (isEdit && editEquipment) {
                await equipmentAPI.update(editEquipment.id, {
                    ...form,
                    condition: form.condition as 'good' | 'fair' | 'poor',
                })
                onSaved()
                onClose()
            } else {
                const res = await equipmentAPI.create(form)
                setCreatedBarcode(res.equipment.barcode)
                onSaved()
            }
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">{isEdit ? "Edit Equipment" : "Add Equipment"}</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-5">
                    {/* After create: show generated barcode */}
                    {createdBarcode ? (
                        <div className="text-center space-y-4">
                            <div className="bg-white/5 border border-border rounded-lg p-6 flex flex-col items-center">
                                <p className="text-sm text-muted-foreground mb-4">Equipment created! Barcode label:</p>
                                <div className="bg-white p-4 rounded-md">
                                    <Barcode
                                        value={createdBarcode}
                                        width={2}
                                        height={60}
                                        fontSize={16}
                                        background="#ffffff"
                                        lineColor="#000000"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Print this barcode and attach it to the equipment.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Label
                                </Button>
                                <Button className="flex-1" onClick={onClose}>Close</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="eq-name">Name <span className="text-destructive">*</span></Label>
                                <Input id="eq-name" required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Sony A7III Camera" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="eq-category">Category <span className="text-destructive">*</span></Label>
                                    <select id="eq-category" required value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm">
                                        <option value="">Select…</option>
                                        {["Camera", "Lens", "Tripod", "Audio", "Lighting", "Other"].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eq-condition">Condition</Label>
                                    <select id="eq-condition" value={form.condition}
                                        onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm">
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eq-location">
                                    Location <span className="text-destructive">*</span>
                                    {!isEdit && <span className="text-xs text-muted-foreground ml-1">(used to generate barcode)</span>}
                                </Label>
                                <Input id="eq-location" required value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Studio A, Storage Room" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eq-date">Purchase Date</Label>
                                <Input id="eq-date" type="date" value={form.purchase_date}
                                    onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                                <Button type="submit" className="flex-1" disabled={loading}>
                                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {isEdit ? "Save Changes" : "Create & Get Barcode"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
