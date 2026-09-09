"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Radio, Search, Plus, Edit, Trash2, ChevronLeft,
    AlertCircle, MapPin, Sun, Moon, Loader2, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    wirelessMicrophoneAPI, getStoredUser, formatAPIError, hasAnyRole,
    type WirelessMicrophone, type User
} from "@/lib/api"

function WirelessMicsPage() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [mics, setMics] = useState<WirelessMicrophone[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [locationFilter, setLocationFilter] = useState("")
    const [locations, setLocations] = useState<string[]>([])

    // Form state
    const [showForm, setShowForm] = useState(false)
    const [editTarget, setEditTarget] = useState<WirelessMicrophone | null>(null)
    const [form, setForm] = useState({ brand_model: "", frequency: "", location: "", notes: "" })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string;
        action: () => void; variant?: "default" | "destructive"
    }>({ isOpen: false, title: "", description: "", action: () => { } })

    const canManage = hasAnyRole(["admin", "coordinator", "supervisor"])

    useEffect(() => {
        const user = getStoredUser()
        if (!user) { router.push("/login"); return }
        setCurrentUser(user)
    }, [router])

    const fetchMics = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params: Record<string, string | number> = { per_page: 200 }
            if (searchQuery) params.search = searchQuery
            if (locationFilter) params.location = locationFilter
            const res = await wirelessMicrophoneAPI.list(params)
            setMics(res.data)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [searchQuery, locationFilter])

    const fetchLocations = useCallback(async () => {
        try {
            const res = await wirelessMicrophoneAPI.locations()
            setLocations(res.locations)
        } catch { /* silent */ }
    }, [])

    useEffect(() => {
        if (currentUser) {
            fetchMics()
            fetchLocations()
        }
    }, [currentUser, fetchMics, fetchLocations])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => fetchMics(), 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const openCreate = () => {
        setEditTarget(null)
        setForm({ brand_model: "", frequency: "", location: "", notes: "" })
        setFormError(null)
        setShowForm(true)
    }

    const openEdit = (mic: WirelessMicrophone) => {
        setEditTarget(mic)
        setForm({
            brand_model: mic.brand_model,
            frequency: mic.frequency,
            location: mic.location,
            notes: mic.notes || "",
        })
        setFormError(null)
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.brand_model.trim() || !form.frequency.trim() || !form.location.trim()) {
            setFormError("Brand/Model, Frequency, and Location are required.")
            return
        }
        setSaving(true)
        setFormError(null)
        try {
            if (editTarget) {
                await wirelessMicrophoneAPI.update(editTarget.id, form)
            } else {
                await wirelessMicrophoneAPI.create(form)
            }
            setShowForm(false)
            fetchMics()
            fetchLocations()
        } catch (err) {
            setFormError(formatAPIError(err))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (mic: WirelessMicrophone) => {
        setConfirmDialog({
            isOpen: true, variant: "destructive",
            title: "Delete Wireless Microphone",
            description: `Are you sure you want to delete "${mic.brand_model}"?`,
            action: async () => {
                try {
                    await wirelessMicrophoneAPI.delete(mic.id)
                    fetchMics()
                    fetchLocations()
                } catch (err) { setError(formatAPIError(err)) }
            }
        })
    }

    const goBack = () => {
        if (!currentUser) return
        const dashPath = hasAnyRole(["admin", "coordinator", "supervisor", "student"])
            ? `/dashboard/${currentUser.role}`
            : "/dashboard"
        router.push(dashPath)
    }

    if (!currentUser) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <>
            {/* Header */}
            <header className="bg-card/70 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                <Radio className="w-6 h-6 text-primary dark:text-white" />
                                Wireless Microphones
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage wireless microphone frequencies and locations</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                            <Button variant="outline" onClick={openCreate}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Microphone
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24">
                {/* Filters */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search brand, frequency, location..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-card/80 border-border"
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                            value={locationFilter}
                            onChange={e => setLocationFilter(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-card/80 border border-border rounded-md text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="">All Locations</option>
                            {locations.map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-muted-foreground ml-auto">
                        {mics.length} microphone{mics.length !== 1 ? "s" : ""}
                    </p>
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
                        Loading microphones...
                    </div>
                ) : mics.length === 0 ? (
                    <div className="text-center py-24">
                        <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No wireless microphones found</h3>
                        <p className="text-muted-foreground text-sm">
                            {searchQuery || locationFilter ? "Try adjusting your filters." : "Start by adding a microphone."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-card/90 backdrop-blur-xl rounded-lg border border-border overflow-x-auto">
                        <table className="min-w-[600px] w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Brand / Model</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Frequency</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                                    {canManage && (
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {mics.map(mic => (
                                    <tr key={mic.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Radio className="w-4 h-4 text-primary flex-shrink-0" />
                                                {mic.brand_model}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs bg-primary/10 text-primary dark:text-white px-2 py-1 rounded">
                                                {mic.frequency}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">📍 {mic.location}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-xs">
                                            {mic.notes || "—"}
                                        </td>
                                        {canManage && (
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mic)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(mic)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Radio className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">{editTarget ? "Edit Microphone" : "Add Microphone"}</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowForm(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{formError}</p>}
                            <div className="space-y-2">
                                <Label htmlFor="wm-brand">Brand / Model <span className="text-destructive">*</span></Label>
                                <Input id="wm-brand" required value={form.brand_model}
                                    onChange={e => setForm(f => ({ ...f, brand_model: e.target.value }))}
                                    placeholder="e.g. Shure SLXD24/SM58" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wm-freq">Frequency <span className="text-destructive">*</span></Label>
                                <Input id="wm-freq" required value={form.frequency}
                                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                                    placeholder="e.g. 470-534 MHz / CH 1" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wm-loc">Location <span className="text-destructive">*</span></Label>
                                <Input id="wm-loc" required value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Studio A, Chapel" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wm-notes">Notes</Label>
                                <Input id="wm-notes" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Optional notes" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button className="flex-1" disabled={saving} onClick={handleSave}>
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {editTarget ? "Save Changes" : "Add Microphone"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                confirmText="Delete"
            />
        </>
    )
}

export default function WirelessMicsPageWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <WirelessMicsPage />
        </RoleProtectedRoute>
    )
}
