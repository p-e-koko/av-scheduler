"use client"

import { X, Printer } from "lucide-react"
import Barcode from "react-barcode"
import { Button } from "@/components/ui/button"
import type { Equipment } from "@/lib/api"

interface Props {
    equipment: Equipment | null
    isOpen: boolean
    onClose: () => void
}

export default function EquipmentDetailModal({ equipment, isOpen, onClose }: Props) {
    if (!isOpen || !equipment) return null

    const handlePrint = () => {
        window.print()
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
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">{equipment.name}</h3>

                    <div className="bg-white p-6 rounded-md shadow-inner flex justify-center mb-6">
                        <Barcode
                            value={equipment.barcode}
                            width={2}
                            height={80}
                            fontSize={16}
                            background="#ffffff"
                            lineColor="#000000"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print Label
                        </Button>
                        <Button className="flex-1" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>

            {/* Print-only section */}
            <div className="hidden print:flex fixed inset-0 bg-white items-center justify-center p-0 m-0 z-[9999]">
                <div className="flex flex-col items-center justify-center border-2 border-black p-8 rounded-lg">
                    <Barcode
                        value={equipment.barcode}
                        width={3}
                        height={100}
                        fontSize={24}
                        background="#ffffff"
                        lineColor="#000000"
                    />
                    <p className="mt-4 text-xl font-mono font-bold tracking-widest">{equipment.barcode}</p>
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
