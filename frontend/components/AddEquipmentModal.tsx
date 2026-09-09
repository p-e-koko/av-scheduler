"use client"

import { useState, useEffect, useRef } from "react"
import { X, Package, Loader2, Printer, Copy, Check, Upload, Image as ImageIcon } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { equipmentAPI, formatAPIError, getStorageUrl, type Equipment } from "@/lib/api"

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
    const [createdName, setCreatedName] = useState<string>("")

    const [form, setForm] = useState({
        name: "", category: "", location: "", purchase_date: "", condition: "good",
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [copiedQR, setCopiedQR] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setCreatedBarcode(null)
            setCreatedName("")
            setImageFile(null)
            if (editEquipment) {
                setForm({
                    name: editEquipment.name,
                    category: editEquipment.category,
                    location: editEquipment.location,
                    purchase_date: editEquipment.purchase_date ?? "",
                    condition: editEquipment.condition,
                })
                setImagePreview(getStorageUrl(editEquipment.image_url || editEquipment.image_path) || null)
            } else {
                setForm({ name: "", category: "", location: "", purchase_date: "", condition: "good" })
                setImagePreview(null)
            }
        }
    }, [isOpen, editEquipment])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError("Image file size exceeds 5MB limit.")
            return
        }

        setError(null)
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setImagePreview(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append("name", form.name)
        formData.append("category", form.category)
        formData.append("location", form.location)
        if (form.purchase_date) formData.append("purchase_date", form.purchase_date)
        formData.append("condition", form.condition)
        if (imageFile) {
            formData.append("image", imageFile)
        }

        try {
            if (isEdit && editEquipment) {
                await equipmentAPI.update(editEquipment.id, formData)
                onSaved()
                onClose()
            } else {
                const res = await equipmentAPI.create(formData)
                setCreatedBarcode(res.equipment.barcode)
                setCreatedName(res.equipment.name)
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
        const textToCopy = `${createdBarcode} - ${createdName || form.name}`

        try {
            await navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy code", err)
        }
    }

    const handleCopyQR = async () => {
        if (!createdBarcode) return

        try {
            const qrCanvas = document.querySelector('.qrcode-container canvas') as HTMLCanvasElement
            if (qrCanvas) {
                const compositeCanvas = document.createElement('canvas')
                const ctx = compositeCanvas.getContext('2d')
                if (!ctx) throw new Error("Could not get canvas context")

                const equipmentTitle = createdName || form.name || "Equipment"
                const margin = 20
                const headerHeight = 30
                const footerHeight = 30

                compositeCanvas.width = qrCanvas.width + (margin * 2)
                compositeCanvas.height = qrCanvas.height + headerHeight + footerHeight + (margin * 2)

                // Fill clean white background
                ctx.fillStyle = "#ffffff"
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)

                // Draw Header (Equipment Name)
                ctx.fillStyle = "#111827"
                ctx.font = "bold 14px sans-serif"
                ctx.textAlign = "center"
                ctx.textBaseline = "top"
                ctx.fillText(equipmentTitle, compositeCanvas.width / 2, margin)

                // Draw QR Code Center
                ctx.drawImage(qrCanvas, margin, margin + headerHeight)

                // Draw Footer (Barcode Code)
                ctx.fillStyle = "#374151"
                ctx.font = "bold 13px monospace"
                ctx.textAlign = "center"
                ctx.textBaseline = "top"
                ctx.fillText(createdBarcode, compositeCanvas.width / 2, margin + headerHeight + qrCanvas.height + 8)

                const blob = await new Promise<Blob | null>(res => compositeCanvas.toBlob(res))
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ])
                    setCopiedQR(true)
                    setTimeout(() => setCopiedQR(false), 2000)
                }
            } else {
                await navigator.clipboard.writeText(`${createdBarcode} - ${createdName || form.name}`)
            }
        } catch (err) {
            console.error("Failed to copy QR code", err)
            navigator.clipboard.writeText(`${createdBarcode} - ${createdName || form.name}`)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">{isEdit ? "Edit Equipment" : "Add Equipment"}</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-5">
                    {/* After create: show generated barcode label */}
                    {createdBarcode ? (
                        <div className="text-center space-y-4">
                            <div className="bg-white/5 border border-border rounded-lg p-6 flex flex-col items-center">
                                <p className="text-sm text-muted-foreground mb-4">Equipment created! Barcode label:</p>
                                <div className="flex flex-col gap-4">
                                    <div className="bg-white p-4 rounded-md qrcode-container flex flex-col items-center border border-gray-200 shadow-sm">
                                        <p className="mb-2 text-xs font-bold text-gray-900 truncate max-w-[200px]">{createdName || form.name}</p>
                                        <QRCodeCanvas
                                            value={createdBarcode}
                                            size={140}
                                            level="H"
                                            includeMargin={false}
                                        />
                                        <p className="mt-2 text-xs font-mono font-bold tracking-widest text-gray-800">{createdBarcode}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Copy or print these labels for the equipment.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleCopy}>
                                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copied ? "Copied!" : "Copy Code"}
                                </Button>
                                <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleCopyQR}>
                                    {copiedQR ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copiedQR ? "Copied!" : "Copy QR Code"}
                                </Button>
                                <Button variant="outline" className="w-full mt-2" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Labels
                                </Button>
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

                            {/* Equipment Photo Upload */}
                            <div className="space-y-2">
                                <Label htmlFor="eq-image">Equipment Photo (Optional)</Label>
                                {imagePreview ? (
                                    <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border group bg-black/20">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 bg-destructive/80 text-white rounded-full p-1 hover:bg-destructive transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label htmlFor="eq-image" className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                                            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                            <p className="text-xs text-muted-foreground font-medium">Click to upload equipment photo</p>
                                            <p className="text-[10px] text-muted-foreground/70">JPG, PNG, WebP (Max 5MB, Auto 30% quality optimized)</p>
                                        </div>
                                        <input
                                            id="eq-image"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="eq-category">Category <span className="text-destructive">*</span></Label>
                                    <select id="eq-category" required value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm">
                                        <option value="">Select…</option>
                                        {["Audio Indoor", "Audio Outdoor", "Livestream", "Lighting", "Other"].map(c => (
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
                                    {isEdit ? "Save Changes" : "Create & Get QR Code"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
