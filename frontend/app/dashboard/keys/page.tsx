"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Key as KeyIcon, Search, Plus, Edit, Trash2, Clock, History,
    CheckCircle, AlertCircle, ChevronLeft, Sun, Moon, LogIn, LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    keyAPI, getStoredUser, formatAPIError, hasAnyRole,
    type Key, type User, type KeyCheckout
} from "@/lib/api"
import { KeyActionModal, KeyHistoryModal, KeyCheckoutModal } from "@/components/KeyModals"

function KeyManagementPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [keys, setKeys] = useState<Key[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const [showActionModal, setShowActionModal] = useState(false)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const { theme, setTheme } = useTheme()
    const [selectedKey, setSelectedKey] = useState<Key | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string;
        action: () => void; variant?: "default" | "destructive"
    }>({ isOpen: false, title: "", description: "", action: () => { } })

    const canManage = hasAnyRole(["admin", "coordinator"])
    const isStudent = hasAnyRole(["student"])

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchKeys = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await keyAPI.list()
            setKeys(res)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (currentUser) {
            fetchKeys()
        }
    }, [currentUser, fetchKeys])

    const handleDelete = (key: Key) => {
        setConfirmDialog({
            isOpen: true, variant: "destructive",
            title: "Delete Key",
            description: `Are you sure you want to delete key "${key.code}"?`,
            action: async () => {
                try {
                    await keyAPI.delete(key.id)
                    fetchKeys()
                } catch (err) { setError(formatAPIError(err)) }
            }
        })
    }

    const handleReturn = async (key: Key) => {
        try {
            await keyAPI.return(key.id)
            fetchKeys()
        } catch (err) {
            setError(formatAPIError(err))
        }
    }

    const goBack = () => {
        if (!currentUser) return
        router.push(`/dashboard/${currentUser.role}`)
    }

    const filteredKeys = keys.filter(k =>
        k.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                <KeyIcon className="w-6 h-6 text-primary dark:text-white" />
                                Key Management
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage and track room keys</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="mr-2"
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                        <NotificationDropdown />
                        {canManage && (
                            <Button variant="default" onClick={() => { setSelectedKey(null); setShowActionModal(true) }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Key
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto">
                {/* Search */}
                <div className="relative w-full max-w-md mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search keys by code or description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 bg-card/80 border-border"
                    />
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        Loading keys...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredKeys.map(key => (
                                <KeyCard
                                    key={key.id}
                                    item={key}
                                    canManage={canManage}
                                    isStudent={isStudent}
                                    onEdit={() => { setSelectedKey(key); setShowActionModal(true) }}
                                    onDelete={() => handleDelete(key)}
                                    onHistory={() => { setSelectedKey(key); setShowHistoryModal(true) }}
                                    onCheckout={() => { setSelectedKey(key); setShowCheckoutModal(true) }}
                                    onReturn={() => handleReturn(key)}
                                />
                            ))}
                        </div>

                        {filteredKeys.length === 0 && (
                            <div className="text-center py-24">
                                <KeyIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No keys found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {searchQuery ? "Try adjusting your search." : "Start by adding some keys."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            <KeyActionModal
                isOpen={showActionModal}
                onClose={() => { setShowActionModal(false); setSelectedKey(null) }}
                onSaved={fetchKeys}
                editKey={selectedKey}
            />
            <KeyCheckoutModal
                isOpen={showCheckoutModal}
                onClose={() => { setShowCheckoutModal(false); setSelectedKey(null) }}
                onSaved={fetchKeys}
                targetKey={selectedKey}
            />
            <KeyHistoryModal
                isOpen={showHistoryModal}
                onClose={() => { setShowHistoryModal(false); setSelectedKey(null) }}
                targetKey={selectedKey}
            />
            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                confirmText="Delete"
            />
        </div>
    )
}

function KeyCard({ item, canManage, isStudent, onEdit, onDelete, onHistory, onCheckout, onReturn }: {
    item: Key,
    canManage: boolean,
    isStudent: boolean,
    onEdit: () => void,
    onDelete: () => void,
    onHistory: () => void,
    onCheckout: () => void,
    onReturn: () => void
}) {
    const isCheckedOut = !!item.current_checkout
    const currentHolder = item.current_checkout?.user?.name

    return (
        <Card className="bg-card/90 backdrop-blur-xl border-border shadow-lg hover:shadow-xl transition-all overflow-hidden flex flex-col">
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-xl text-foreground tracking-tight">{item.code}</h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${isCheckedOut ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                            {isCheckedOut ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                            {isCheckedOut ? "In Use" : "Available"}
                        </Badge>
                    </div>

                    {isCheckedOut && (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Current Holder</p>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-600">
                                    {currentHolder?.charAt(0) ?? "?"}
                                </div>
                                <span className="text-sm font-medium text-foreground">{currentHolder ?? "Unknown User"}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground pt-1 italic">Purpose: {item.current_checkout?.purpose}</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 mt-auto border-t border-border/50 flex flex-wrap gap-2">
                    {isStudent && (
                        isCheckedOut ? (
                            <Button variant="outline" size="sm" className="flex-1 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 border-amber-500/20" onClick={onReturn}>
                                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Return
                            </Button>
                        ) : (
                            <Button variant="default" size="sm" className="flex-1 group" onClick={onCheckout}>
                                <LogIn className="w-3.5 h-3.5 mr-1.5 group-hover:translate-x-0.5 transition-transform" /> Checkout
                            </Button>
                        )
                    )}
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onHistory} title="View History">
                        <History className="w-4 h-4" />
                    </Button>
                    {canManage && (
                        <>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onEdit} title="Edit Key">
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={onDelete} title="Delete Key">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function KeyManagementWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <KeyManagementPage />
        </RoleProtectedRoute>
    )
}
