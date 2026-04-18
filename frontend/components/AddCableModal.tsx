"use client"

import { useState, useEffect, useRef } from "react"
import { X, Package, Loader2, Printer, Copy, Check } from "lucide-react"
import Barcode from "react-barcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cableAPI, formatAPIError, type Cable } from "@/lib/api"

interface Props {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    editCable?: Cable | null
}

export default function AddCableModal({ isOpen, onClose, onSaved, editCable }: Props) {
    const isEdit = !!editCable
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdBarcode, setCreatedBarcode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const [form, setForm] = useState({
        name: "",
        length: "",
        amount: 0,
        category: "XLR",
        location: "",
        purchase_date: "",
        condition: "good",
    })

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setCreatedBarcode(null)
            if (editCable) {
                setForm({
                    name: editCable.name,
                    length: editCable.length,
                    amount: editCable.amount,
                    category: editCable.category || "Other",
                    location: editCable.location,
                    purchase_date: editCable.purchase_date ?? "",
                    condition: editCable.condition,
                })
            } else {
                setForm({ name: "", length: "", amount: 0, category: "XLR", location: "", purchase_date: "", condition: "good" })
            }
        }
    }, [isOpen, editCable])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (isEdit && editCable) {
                await cableAPI.update(editCable.id, {
                    ...form,
                    condition: form.condition as 'good' | 'fair' | 'poor',
                })
                onSaved()
                onClose()
            } else {
                const res = await cableAPI.create(form)
                setCreatedBarcode(res.cable.barcode)
                onSaved()
            }
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!createdBarcode) return
        try {
            const canvas = document.querySelector('.barcode-container-cable canvas') as HTMLCanvasElement
            if (canvas) {
                const blob = await new Promise<Blob | null>(res => canvas.toBlob(res))
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ])
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                }
            } else {
                await navigator.clipboard.writeText(createdBarcode)
            }
        } catch (err) {
            console.error("Failed to copy", err)
            navigator.clipboard.writeText(createdBarcode)
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
                        <h2 className="text-lg font-semibold">{isEdit ? "Edit Cable" : "Add Cable"}</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-5">
                    {createdBarcode ? (
                        <div className="text-center space-y-4">
                            <div className="bg-white/5 border border-border rounded-lg p-6 flex flex-col items-center">
                                <p className="text-sm text-muted-foreground mb-4">Cable created! Barcode label:</p>
                                <div className="bg-white p-4 rounded-md barcode-container-cable">
                                    <Barcode
                                        value={createdBarcode}
                                        width={2}
                                        height={60}
                                        fontSize={16}
                                        background="#ffffff"
                                        lineColor="#000000"
                                        renderer="canvas"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Copy or print this barcode for the cable bundle.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={handleCopy}>
                                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copied ? "Copied!" : "Copy Label"}
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Label
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cb-name">Name <span className="text-destructive">*</span></Label>
                                <Input id="cb-name" required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. XLR Cable" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="cb-length">Length <span className="text-destructive">*</span></Label>
                                    <Input id="cb-length" required value={form.length}
                                        onChange={e => setForm(f => ({ ...f, length: e.target.value }))}
                                        placeholder="e.g. 5m, 10m" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cb-amount">Initial Amount <span className="text-destructive">*</span></Label>
                                    <Input id="cb-amount" type="number" required value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                                        min={0} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="cb-category">Category <span className="text-destructive">*</span></Label>
                                    <select id="cb-category" required value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm">
                                        {["XLR", "HDMI", "SDI", "USB", "Power", "Other"].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cb-condition">Condition</Label>
                                    <select id="cb-condition" value={form.condition}
                                        onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm">
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cb-location">
                                    Location <span className="text-destructive">*</span>
                                </Label>
                                <Input id="cb-location" required value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Cable Bin 1, Studio A" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cb-date">Purchase Date</Label>
                                <Input id="cb-date" type="date" value={form.purchase_date}
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
