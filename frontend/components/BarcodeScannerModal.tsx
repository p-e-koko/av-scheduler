"use client"

import { useState, useEffect, useRef } from "react"
import { X, QrCode, CheckCircle, AlertCircle, Loader2, Camera, Keyboard } from "lucide-react"
import { BrowserMultiFormatReader } from "@zxing/library"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { equipmentAPI, formatAPIError, type Equipment } from "@/lib/api"

interface Props {
    isOpen: boolean
    onClose: () => void
}

type ScanStep = "scan" | "checkout" | "confirm_return" | "result"

export default function BarcodeScannerModal({ isOpen, onClose }: Props) {
    const [step, setStep] = useState<ScanStep>("scan")
    const [barcode, setBarcode] = useState("")
    const [equipment, setEquipment] = useState<Equipment | null>(null)
    const [eventNote, setEventNote] = useState("")
    const [returnNote, setReturnNote] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resultMessage, setResultMessage] = useState("")
    const [resultSuccess, setResultSuccess] = useState(true)
    const [isCameraActive, setIsCameraActive] = useState(true)

    const inputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

    useEffect(() => {
        if (isOpen) {
            setStep("scan")
            setBarcode("")
            setEquipment(null)
            setEventNote("")
            setReturnNote("")
            setError(null)
            setResultMessage("")
            setIsCameraActive(true)
            if (!isCameraActive) {
                setTimeout(() => inputRef.current?.focus(), 100)
            }
        } else {
            stopScanner()
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen && step === "scan" && isCameraActive && videoRef.current) {
            startScanner()
        } else {
            stopScanner()
        }
        return () => stopScanner()
    }, [isOpen, step, isCameraActive])

    const startScanner = async () => {
        try {
            const codeReader = new BrowserMultiFormatReader()
            codeReaderRef.current = codeReader

            await codeReader.decodeFromVideoDevice(
                null,
                videoRef.current!,
                (result) => {
                    if (result) {
                        const code = result.getText()
                        setBarcode(code)
                        handleScan(code)
                    }
                }
            )
        } catch (err) {
            console.error("Scanner error:", err)
        }
    }

    const stopScanner = () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset()
            codeReaderRef.current = null
        }
    }

    const handleScan = async (codeToScan?: string | React.MouseEvent) => {
        const targetBarcode = typeof codeToScan === 'string' ? codeToScan : barcode
        if (!targetBarcode.trim()) return

        setLoading(true)
        setError(null)
        stopScanner()

        try {
            const res = await equipmentAPI.scan(targetBarcode.trim())
            const item = res.equipment
            setEquipment(item)

            if (item.status === "available") {
                setStep("checkout")
            } else if (item.status === "checked_out") {
                setStep("confirm_return")
            } else {
                setError(`This equipment is currently under maintenance and cannot be checked out.`)
            }
        } catch (err: any) {
            setError(formatAPIError(err))
            // Only restart scanner if we were in camera mode and failed
            if (isCameraActive && step === "scan") startScanner()
        } finally {
            setLoading(false)
        }
    }

    const handleCheckout = async () => {
        if (!eventNote.trim()) { setError("Event note is required."); return }
        if (!equipment) return
        setLoading(true)
        setError(null)
        try {
            const res = await equipmentAPI.checkout(equipment.barcode, eventNote.trim())
            setResultMessage(res.message)
            setResultSuccess(true)
            setStep("result")
        } catch (err: any) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleReturn = async () => {
        if (!equipment) return
        setLoading(true)
        setError(null)
        try {
            const res = await equipmentAPI.return(equipment.barcode, returnNote.trim() || undefined)
            setResultMessage(res.message)
            setResultSuccess(true)
            setStep("result")
        } catch (err: any) {
            setResultMessage(formatAPIError(err))
            setResultSuccess(false)
            setStep("result")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Equipment Scanner</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Step: Scan */}
                    {step === "scan" && (
                        <>
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-sm text-muted-foreground">
                                    {isCameraActive ? "Point camera at the barcode" : "Type barcode manually"}
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setIsCameraActive(!isCameraActive)}
                                >
                                    {isCameraActive ? (
                                        <><Keyboard className="w-3 h-3 mr-1" /> Manual</>
                                    ) : (
                                        <><Camera className="w-3 h-3 mr-1" /> Camera</>
                                    )}
                                </Button>
                            </div>

                            {isCameraActive ? (
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border group">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-32 border-2 border-primary rounded-lg opacity-50 scanner-aim" />
                                    </div>
                                    {loading && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="barcode-input">Barcode Number</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="barcode-input"
                                            ref={inputRef}
                                            value={barcode}
                                            onChange={e => setBarcode(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleScan()}
                                            placeholder="e.g. STUDIOA-001"
                                            className="font-mono"
                                        />
                                        <Button onClick={() => handleScan()} disabled={loading || !barcode.trim()}>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{error}</p>}
                        </>
                    )}

                    {/* Step: Checkout */}
                    {step === "checkout" && equipment && (
                        <>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    Equipment Available
                                </p>
                                <p className="text-sm text-foreground mt-1 font-medium">{equipment.name}</p>
                                <p className="text-xs text-muted-foreground">{equipment.barcode} · {equipment.location}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-note">
                                    Event / Purpose <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="event-note"
                                    autoFocus
                                    value={eventNote}
                                    onChange={e => setEventNote(e.target.value)}
                                    placeholder="e.g. Sunday Worship Service 2026-04-20"
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep("scan")}>Back</Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleCheckout} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Check Out
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step: Confirm Return */}
                    {step === "confirm_return" && equipment && (
                        <>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    Currently Checked Out
                                </p>
                                <p className="text-sm text-foreground mt-1 font-medium">{equipment.name}</p>
                                {equipment.current_checkout && (
                                    <>
                                        <p className="text-xs text-muted-foreground">
                                            Held by: <span className="text-foreground">{equipment.current_checkout?.user?.name}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            For: {equipment.current_checkout?.event_note}
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="return-note">Return Note (optional)</Label>
                                <Input
                                    id="return-note"
                                    autoFocus
                                    value={returnNote}
                                    onChange={e => setReturnNote(e.target.value)}
                                    placeholder="e.g. Returned in good condition"
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <p className="text-xs text-muted-foreground">
                                ⚠️ Only the person who checked it out can return this equipment.
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep("scan")}>Back</Button>
                                <Button className="flex-1" onClick={handleReturn} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Return Equipment
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step: Result */}
                    {step === "result" && (
                        <>
                            <div className={`rounded-lg p-4 text-center ${resultSuccess ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
                                {resultSuccess
                                    ? <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                                    : <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                                }
                                <p className="text-sm font-medium text-foreground">{resultMessage}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1" variant="outline"
                                    onClick={() => { setStep("scan"); setBarcode(""); setEquipment(null); setEventNote(""); setReturnNote("") }}>
                                    Scan Another
                                </Button>
                                <Button className="flex-1" onClick={onClose}>Done</Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
