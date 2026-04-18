"use client"

import { X, Printer, Copy, Check } from "lucide-react"
import { useState, useRef } from "react"
import Barcode from "react-barcode"
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

    const handleCopy = async () => {
        try {
            const canvas = document.querySelector('.barcode-detail-container canvas') as HTMLCanvasElement
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
                await navigator.clipboard.writeText(displayItem.barcode)
            }
        } catch (err) {
            console.error("Failed to copy barcode", err)
            navigator.clipboard.writeText(displayItem.barcode)
        }
    }

    const handleCopyQR = async () => {
        try {
            const qrCanvas = document.querySelector('.qrcode-detail-container canvas') as HTMLCanvasElement
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
                ctx.fillText(displayItem.barcode, compositeCanvas.width / 2, qrCanvas.height + margin + 4)

                const blob = await new Promise<Blob | null>(res => compositeCanvas.toBlob(res))
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ])
                    setCopiedQR(true)
                    setTimeout(() => setCopiedQR(false), 2000)
                }
            } else {
                await navigator.clipboard.writeText(displayItem.barcode)
            }
        } catch (err) {
            console.error("Failed to copy QR code", err)
            navigator.clipboard.writeText(displayItem.barcode)
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

                <div className="p-6 text-center">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">{displayItem.name}</h3>

                    <div className="flex flex-col gap-4 mb-6">
                        <div className="bg-white p-6 rounded-md shadow-inner flex justify-center barcode-detail-container">
                            <Barcode
                                value={displayItem.barcode}
                                width={2}
                                height={80}
                                fontSize={16}
                                background="#ffffff"
                                lineColor="#000000"
                                renderer="canvas"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-md shadow-inner flex flex-col items-center qrcode-detail-container">
                            <QRCodeCanvas
                                value={displayItem.barcode}
                                size={128}
                                level="H"
                                includeMargin={false}
                            />
                            <p className="mt-4 text-sm font-mono font-bold tracking-widest text-black">{displayItem.barcode}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleCopy}>
                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copied ? "Copied!" : "Copy Barcode"}
                        </Button>
                        <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleCopyQR}>
                            {copiedQR ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copiedQR ? "Copied!" : "Copy QR Code"}
                        </Button>
                        <Button variant="outline" className="w-full mt-2" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print Label
                        </Button>
                    </div>
                </div>
            </div>

            {/* Print-only section */}
            <div className="hidden print:flex fixed inset-0 bg-white items-center justify-center p-0 m-0 z-[9999]">
                <div className="flex flex-col items-center justify-center border-2 border-black p-8 rounded-lg">
                    <Barcode
                        value={displayItem.barcode}
                        width={3}
                        height={100}
                        fontSize={24}
                        background="#ffffff"
                        lineColor="#000000"
                    />
                    <p className="mt-4 text-xl font-mono font-bold tracking-widest">{displayItem.barcode}</p>
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
