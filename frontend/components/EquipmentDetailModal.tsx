"use client"

import { X, Printer, Copy, Check } from "lucide-react"
import { useState, useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Button } from "@/components/ui/button"
import type { Equipment, Cable } from "@/lib/api"

interface Props {
    equipment: Equipment | null
    cable?: Cable | null
    isOpen: boolean
    onClose: () => void
}

export default function EquipmentDetailModal({ equipment, cable, isOpen, onClose }: Props) {
    if (!isOpen || (!equipment && !cable)) return null
    const displayItem = equipment || cable!

    const [copied, setCopied] = useState(false)
    const [copiedQR, setCopiedQR] = useState(false)
    const handlePrint = () => {
        window.print()
    }

    const handleCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy code", err)
        }
    }

    const handleCopyQR = async (code: string, containerId: string) => {
        try {
            const qrCanvas = document.querySelector(`#${containerId} canvas`) as HTMLCanvasElement
            if (qrCanvas) {
                // Composite canvas to include text label
                const compositeCanvas = document.createElement('canvas')
                const ctx = compositeCanvas.getContext('2d')
                if (!ctx) throw new Error("Could not get canvas context")

                const textPadding = 20
                const margin = 20
                compositeCanvas.width = qrCanvas.width + (margin * 2)
                compositeCanvas.height = qrCanvas.height + textPadding + (margin * 2)

                // Fill white background
                ctx.fillStyle = "#ffffff"
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)

                // Draw QR Code
                ctx.drawImage(qrCanvas, margin, margin)

                // Draw Text
                ctx.fillStyle = "#000000"
                ctx.font = "bold 16px monospace"
                ctx.textAlign = "center"
                ctx.textBaseline = "top"
                ctx.fillText(code, compositeCanvas.width / 2, qrCanvas.height + margin + 4)

                const blob = await new Promise<Blob | null>(res => compositeCanvas.toBlob(res))
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ])
                    setCopiedQR(true)
                    setTimeout(() => setCopiedQR(false), 2000)
                }
            } else {
                await navigator.clipboard.writeText(code)
            }
        } catch (err) {
            console.error("Failed to copy QR code", err)
            await navigator.clipboard.writeText(code)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden print:hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Equipment Detail</h2>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-6 text-center h-[500px] overflow-y-auto custom-scrollbar">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">{displayItem.name}</h3>

                    <div className="flex flex-col gap-6 mb-6">
                        {/* If it's a cable with amount > 1, show multiple QR codes */}
                        {cable && cable.amount > 1 ? (
                            Array.from({ length: cable.amount }, (_, i) => i + 1).map(num => {
                                const code = `${displayItem.barcode}-${num}`
                                const containerId = `qrcode-container-${num}`
                                return (
                                    <div key={num} className="bg-white/5 border border-border/50 p-4 rounded-lg">
                                        <p className="text-xs font-mono text-muted-foreground mb-3 text-left">Label #{num}</p>
                                        <div className="bg-white p-4 rounded-md shadow-inner flex flex-col items-center" id={containerId}>
                                            <QRCodeCanvas
                                                value={code}
                                                size={120}
                                                level="H"
                                                includeMargin={false}
                                            />
                                            <p className="mt-4 text-sm font-mono font-bold tracking-widest text-black">{code}</p>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleCopy(code)}>
                                                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                                Copy Code
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleCopyQR(code, containerId)}>
                                                {copiedQR ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                                Copy QR
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="bg-white/5 border border-border/50 p-4 rounded-lg">
                                <div className="bg-white p-6 rounded-md shadow-inner flex flex-col items-center" id="qrcode-detail-single">
                                    <QRCodeCanvas
                                        value={displayItem.barcode}
                                        size={140}
                                        level="H"
                                        includeMargin={false}
                                    />
                                    <p className="mt-4 text-sm font-mono font-bold tracking-widest text-black">{displayItem.barcode}</p>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <Button variant="outline" className="flex-1" onClick={() => handleCopy(displayItem.barcode)}>
                                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy Code
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => handleCopyQR(displayItem.barcode, "qrcode-detail-single")}>
                                        {copiedQR ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy QR
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button variant="outline" className="w-full" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print Labels
                        </Button>
                    </div>
                </div>
            </div>

            {/* Print-only section */}
            <div className="hidden print:flex fixed inset-0 bg-white items-center justify-center p-0 m-0 z-[9999]">
                <div className="flex flex-col gap-8 items-center py-10">
                    {cable && cable.amount > 1 ? (
                        Array.from({ length: cable.amount }, (_, i) => i + 1).map(num => (
                            <div key={num} className="flex flex-col items-center justify-center border-2 border-black p-8 rounded-lg page-break-after-always">
                                <QRCodeCanvas
                                    value={`${displayItem.barcode}-${num}`}
                                    size={200}
                                    level="H"
                                />
                                <p className="mt-4 text-2xl font-mono font-bold tracking-widest">{displayItem.barcode}-{num}</p>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center border-2 border-black p-8 rounded-lg">
                            <QRCodeCanvas
                                value={displayItem.barcode}
                                size={200}
                                level="H"
                            />
                            <p className="mt-4 text-2xl font-mono font-bold tracking-widest">{displayItem.barcode}</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print\\:block, .print\\:flex {
                        visibility: visible !important;
                    }
                    .print\\:block *, .print\\:flex * {
                        visibility: visible !important;
                    }
                    /* Ensure the print content is the only thing visible and fills the page or sits at top */
                    .print\\:flex {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100vh;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    )
}
