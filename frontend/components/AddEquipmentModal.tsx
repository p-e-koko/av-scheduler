"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Package, Loader2, Printer, Copy, Check, Upload, Image as ImageIcon, Camera, SwitchCamera, Maximize2 } from "lucide-react"
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
    const [fullscreenImage, setFullscreenImage] = useState(false)

    // Camera capture state
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setCameraActive(false)
        setCameraError(null)
    }, [])

    const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
        setCameraError(null)
        // Stop any existing stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            })
            streamRef.current = stream
            setCameraActive(true)
            // Wait for the video element to be available
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play().catch(() => { })
                }
            })
        } catch (err: any) {
            console.error("Camera access error:", err)
            if (err.name === "NotAllowedError") {
                setCameraError("Camera permission denied. Please allow camera access.")
            } else if (err.name === "NotFoundError") {
                setCameraError("No camera found on this device.")
            } else {
                setCameraError("Could not access camera. Please try again.")
            }
            setCameraActive(false)
        }
    }, [facingMode])

    const handleSwitchCamera = useCallback(() => {
        const newFacing = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newFacing)
        if (cameraActive) {
            startCamera(newFacing)
        }
    }, [facingMode, cameraActive, startCamera])

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.drawImage(video, 0, 0)
        canvas.toBlob(
            (blob) => {
                if (!blob) return
                const file = new File([blob], `camera_${Date.now()}.webp`, { type: "image/webp" })
                setImageFile(file)
                setImagePreview(URL.createObjectURL(blob))
                stopCamera()
            },
            "image/webp",
            0.85
        )
    }, [stopCamera])

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setCreatedBarcode(null)
            setCreatedName("")
            setImageFile(null)
            stopCamera()
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
        } else {
            // Modal closed — always stop camera
            stopCamera()
        }
    }, [isOpen, editEquipment, stopCamera])

    // Cleanup camera on unmount
    useEffect(() => {
        return () => { stopCamera() }
    }, [stopCamera])

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
        <>
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

                                {/* Equipment Photo Upload / Camera Capture */}
                                <div className="space-y-2">
                                    <Label>Equipment Photo (Optional)</Label>
                                    {/* Hidden canvas for camera capture */}
                                    <canvas ref={canvasRef} className="hidden" />

                                    {imagePreview ? (
                                        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border group bg-black/20">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                            <div className="absolute top-2 right-2 flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setFullscreenImage(true)}
                                                    className="bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="View fullscreen"
                                                >
                                                    <Maximize2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="bg-destructive/80 text-white rounded-full p-1 hover:bg-destructive transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : cameraActive ? (
                                        <div className="relative w-full rounded-lg overflow-hidden border-2 border-primary/50 bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-48 object-cover"
                                            />
                                            {/* Camera overlay controls */}
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-center gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                                                    onClick={stopCamera}
                                                >
                                                    <X className="w-3.5 h-3.5 mr-1" />
                                                    Cancel
                                                </Button>
                                                <button
                                                    type="button"
                                                    onClick={handleCapture}
                                                    className="w-12 h-12 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center backdrop-blur-sm"
                                                    title="Take Photo"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white" />
                                                </button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                                                    onClick={handleSwitchCamera}
                                                    title="Switch Camera"
                                                >
                                                    <SwitchCamera className="w-3.5 h-3.5 mr-1" />
                                                    Flip
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {cameraError && (
                                                <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded">{cameraError}</p>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                                <label htmlFor="eq-image" className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                                                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                                                    <p className="text-xs text-muted-foreground font-medium">Upload File</p>
                                                    <p className="text-[10px] text-muted-foreground/70">JPG, PNG, WebP</p>
                                                    <input
                                                        id="eq-image"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageChange}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => startCamera()}
                                                    className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                                                >
                                                    <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                                                    <p className="text-xs text-muted-foreground font-medium">Take Photo</p>
                                                    <p className="text-[10px] text-muted-foreground/70">Use camera</p>
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-center text-muted-foreground/60">Max 5MB · Auto compressed to 30% quality</p>
                                        </div>
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

            {/* Fullscreen Image Lightbox */}
            {
                fullscreenImage && imagePreview && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out"
                        onClick={() => setFullscreenImage(false)}
                        onKeyDown={(e) => { if (e.key === "Escape") setFullscreenImage(false) }}
                        tabIndex={0}
                        role="dialog"
                        aria-label="Fullscreen image preview"
                    >
                        <button
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); setFullscreenImage(false) }}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={imagePreview}
                            alt="Equipment fullscreen"
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )
            }
        </>
    )
}
