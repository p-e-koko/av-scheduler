"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Package, QrCode, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import BarcodeScannerModal from "@/components/BarcodeScannerModal"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import { equipmentAPI, getStoredUser, formatAPIError, type EquipmentCheckout, type User } from "@/lib/api"

function MyEquipmentPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [checkouts, setCheckouts] = useState<EquipmentCheckout[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showScanner, setShowScanner] = useState(false)

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchMyEquipment = async () => {
        try {
            setLoading(true)
            const res = await equipmentAPI.myEquipment()
            setCheckouts(res.checkouts)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (currentUser) fetchMyEquipment() }, [currentUser])

    const fmt = (dt: string) => new Date(dt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
    })

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <>
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" />
                            My Equipment
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Equipment currently in your possession</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                        <Button onClick={() => setShowScanner(true)}
                            className="bg-gradient-to-r from-primary to-primary-medium text-primary-foreground hover:shadow-lg">
                            <QrCode className="w-4 h-4 mr-2" />
                            Return via Scan
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-4 sm:p-6">
                {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-12 text-muted-foreground">Loading...</div>
                ) : checkouts.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No equipment in your possession</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Scan a barcode on available equipment to check it out.
                        </p>
                        <Button onClick={() => router.push("/dashboard/inventory")}>Browse Inventory</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {checkouts.map(c => (
                            <Card key={c.id} className="bg-card/90 backdrop-blur-xl border-0 shadow-lg">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-semibold text-foreground">{c.equipment?.name}</h3>
                                            <p className="text-xs font-mono text-muted-foreground">{c.equipment?.barcode}</p>
                                        </div>
                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs shrink-0">
                                            <Clock className="w-3 h-3 mr-1" />
                                            In Use
                                        </Badge>
                                    </div>
                                    <div className="text-xs space-y-1">
                                        <p className="text-muted-foreground">📍 {c.equipment?.location}</p>
                                        <p><span className="text-muted-foreground">Event: </span><span className="text-foreground">{c.event_note}</span></p>
                                        <p className="text-muted-foreground">Taken: {fmt(c.checked_out_at)}</p>
                                    </div>
                                    <div className="pt-1 border-t border-border">
                                        <Button size="sm" className="w-full" onClick={() => setShowScanner(true)}>
                                            <QrCode className="w-3.5 h-3.5 mr-2" />
                                            Return this Equipment
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                {checkouts.length > 0 && (
                    <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please return equipment by scanning its barcode when done.
                    </p>
                )}
            </main>

            <BarcodeScannerModal
                isOpen={showScanner}
                onClose={() => { setShowScanner(false); fetchMyEquipment() }}
            />
        </>
    )
}

export default function MyEquipmentWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <MyEquipmentPage />
        </RoleProtectedRoute>
    )
}
