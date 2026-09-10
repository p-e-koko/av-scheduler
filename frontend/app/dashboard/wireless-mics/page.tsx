"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Radio, Search, Plus, Edit, Trash2, ChevronLeft,
    AlertCircle, MapPin, Sun, Moon, Loader2, X,
    LayoutGrid, List, Sliders, Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { DashboardSidebarWrapper, MobileSidebarTrigger } from "@/components/DashboardSidebarWrapper"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
    wirelessMicrophoneAPI, getStoredUser, formatAPIError, hasAnyRole,
    type WirelessMicrophone, type ReceiverChannel, type User
} from "@/lib/api"

function ReceiverManagementPage() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [mics, setMics] = useState<WirelessMicrophone[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [locationFilter, setLocationFilter] = useState("")
    const [typeFilter, setTypeFilter] = useState("")
    const [locations, setLocations] = useState<string[]>([])
    const [viewMode, setViewMode] = useState<"list" | "grid">("list")

    // Form state for Receiver Management
    const [showForm, setShowForm] = useState(false)
    const [editTarget, setEditTarget] = useState<WirelessMicrophone | null>(null)
    const [form, setForm] = useState<{
        brand_model: string;
        type: "Digital" | "Analog";
        channels_count: number;
        channels: ReceiverChannel[];
        location: string;
        notes: string;
    }>({
        brand_model: "",
        type: "Digital",
        channels_count: 1,
        channels: [{ channel_number: 1, frequency: "" }],
        location: "",
        notes: "",
    })
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
            if (typeFilter) params.type = typeFilter
            const res = await wirelessMicrophoneAPI.list(params)
            setMics(res.data)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [searchQuery, locationFilter, typeFilter])

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

    const updateChannelsCount = (count: number) => {
        const validCount = Math.max(1, Math.min(32, count || 1))
        setForm(prev => {
            const currentChannels = [...prev.channels]
            if (validCount > currentChannels.length) {
                for (let i = currentChannels.length + 1; i <= validCount; i++) {
                    currentChannels.push({ channel_number: i, frequency: "" })
                }
            } else if (validCount < currentChannels.length) {
                currentChannels.splice(validCount)
            }
            return {
                ...prev,
                channels_count: validCount,
                channels: currentChannels
            }
        })
    }

    const handleChannelFreqChange = (index: number, freq: string) => {
        setForm(prev => {
            const newChans = [...prev.channels]
            newChans[index] = { ...newChans[index], frequency: freq }
            return { ...prev, channels: newChans }
        })
    }

    const openCreate = () => {
        setEditTarget(null)
        setForm({
            brand_model: "",
            type: "Digital",
            channels_count: 1,
            channels: [{ channel_number: 1, frequency: "" }],
            location: "",
            notes: "",
        })
        setFormError(null)
        setShowForm(true)
    }

    const openEdit = (mic: WirelessMicrophone) => {
        setEditTarget(mic)
        const count = mic.channels_count || (mic.channels ? mic.channels.length : 1)
        let initialChannels: ReceiverChannel[] = mic.channels && mic.channels.length > 0
            ? mic.channels.map((c, idx) => ({ channel_number: c.channel_number || idx + 1, frequency: c.frequency || "" }))
            : [{ channel_number: 1, frequency: mic.frequency || "" }]

        if (initialChannels.length < count) {
            for (let i = initialChannels.length + 1; i <= count; i++) {
                initialChannels.push({ channel_number: i, frequency: "" })
            }
        } else if (initialChannels.length > count) {
            initialChannels = initialChannels.slice(0, count)
        }

        setForm({
            brand_model: mic.brand_model,
            type: mic.type === "Analog" ? "Analog" : "Digital",
            channels_count: count,
            channels: initialChannels,
            location: mic.location,
            notes: mic.notes || "",
        })
        setFormError(null)
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.brand_model.trim() || !form.location.trim()) {
            setFormError("Model/Brand and Location are required.")
            return
        }
        for (let i = 0; i < form.channels.length; i++) {
            if (!form.channels[i].frequency.trim()) {
                setFormError(`Please enter a frequency for Channel ${form.channels[i].channel_number}.`)
                return
            }
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
            title: "Delete Receiver",
            description: `Are you sure you want to delete receiver "${mic.brand_model}"?`,
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
                    <div className="flex items-center gap-3">
                        <MobileSidebarTrigger />
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                <Radio className="w-6 h-6 text-primary dark:text-white" />
                                Receiver Management
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage wireless receivers, types (Digital/Analog), channels, frequencies, and locations</p>
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
                                Add Receiver
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24">
                {/* Top Controls: Search, Filter, View Toggles */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search model, type, frequency..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 bg-card/80 border-border"
                            />
                        </div>

                        <div className="relative w-full sm:w-36">
                            <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-card/80 border border-border rounded-md text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">All Types</option>
                                <option value="Digital">Digital</option>
                                <option value="Analog">Analog</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-44">
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
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                        {/* View Switcher Toggle */}
                        <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
                            <Button
                                variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className="h-8 px-3"
                                title="Table view"
                            >
                                <List className="w-4 h-4 mr-1 sm:mr-1.5" />
                                <span className="text-xs">Table</span>
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className="h-8 px-3"
                                title="Card view"
                            >
                                <LayoutGrid className="w-4 h-4 mr-1 sm:mr-1.5" />
                                <span className="text-xs">Cards</span>
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {mics.length} receiver{mics.length !== 1 ? "s" : ""}
                        </p>
                    </div>
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
                        Loading receivers...
                    </div>
                ) : mics.length === 0 ? (
                    <div className="text-center py-24">
                        <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No receivers found</h3>
                        <p className="text-muted-foreground text-sm">
                            {searchQuery || locationFilter || typeFilter ? "Try adjusting your filters." : "Start by adding a receiver."}
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    /* Mobile-Friendly Grid / Card Layout */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {mics.map(mic => {
                            const count = mic.channels_count || (mic.channels ? mic.channels.length : 1)
                            const channelsList = mic.channels && mic.channels.length > 0
                                ? mic.channels
                                : [{ channel_number: 1, frequency: mic.frequency || "" }]
                            const isDigital = mic.type !== "Analog"

                            return (
                                <Card key={mic.id} className="bg-card/90 backdrop-blur-xl border border-border shadow-md hover:shadow-lg transition-all">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Radio className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-foreground text-sm truncate">{mic.brand_model}</h3>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        {mic.location}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isDigital
                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                    }`}>
                                                    {isDigital ? "Digital" : "Analog"}
                                                </span>
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {count} {count === 1 ? "Ch" : "Chs"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Frequencies</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {channelsList.map((ch, i) => (
                                                    <span key={i} className="font-mono text-xs font-medium text-primary dark:text-white bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                        Ch {ch.channel_number}: {ch.frequency || "—"}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {mic.notes && (
                                            <div className="text-xs bg-muted/40 p-2 rounded text-muted-foreground">
                                                {mic.notes}
                                            </div>
                                        )}

                                        {canManage && (
                                            <div className="pt-2 border-t border-border flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => openEdit(mic)}>
                                                    <Edit className="w-3.5 h-3.5" /> Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1" onClick={() => handleDelete(mic)}>
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    /* Desktop / Table Layout with Fallback to Mobile Cards */
                    <>
                        {/* Hidden on small screens, visible on md and up */}
                        <div className="hidden md:block bg-card/90 backdrop-blur-xl rounded-lg border border-border overflow-x-auto">
                            <table className="min-w-[650px] w-full text-left text-sm">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Receiver Model</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Channels</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Frequencies</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Notes</th>
                                        {canManage && (
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mics.map(mic => {
                                        const count = mic.channels_count || (mic.channels ? mic.channels.length : 1)
                                        const channelsList = mic.channels && mic.channels.length > 0
                                            ? mic.channels
                                            : [{ channel_number: 1, frequency: mic.frequency || "" }]
                                        const isDigital = mic.type !== "Analog"

                                        return (
                                            <tr key={mic.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Radio className="w-4 h-4 text-primary flex-shrink-0" />
                                                        {mic.brand_model}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${isDigital
                                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                        }`}>
                                                        {isDigital ? "Digital" : "Analog"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                                                        {count} {count === 1 ? "Ch" : "Chs"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1 max-w-md">
                                                        {channelsList.map((ch, i) => (
                                                            <span key={i} className="font-mono text-xs bg-primary/10 text-primary dark:text-white px-2 py-0.5 rounded">
                                                                Ch {ch.channel_number}: {ch.frequency || "—"}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">  {mic.location}</td>
                                                <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
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
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards (Shown on small screens when in Table mode) */}
                        <div className="md:hidden space-y-3">
                            {mics.map(mic => {
                                const count = mic.channels_count || (mic.channels ? mic.channels.length : 1)
                                const channelsList = mic.channels && mic.channels.length > 0
                                    ? mic.channels
                                    : [{ channel_number: 1, frequency: mic.frequency || "" }]
                                const isDigital = mic.type !== "Analog"

                                return (
                                    <Card key={mic.id} className="bg-card/90 border border-border shadow-sm">
                                        <CardContent className="p-4 space-y-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <Radio className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-sm leading-tight text-foreground truncate">{mic.brand_model}</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">  {mic.location}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isDigital
                                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                        }`}>
                                                        {isDigital ? "Digital" : "Analog"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-1.5 border-t border-border space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Frequencies</span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {count} {count === 1 ? "Channel" : "Channels"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {channelsList.map((ch, i) => (
                                                        <span key={i} className="font-mono text-xs bg-primary/10 text-primary dark:text-white px-2 py-0.5 rounded">
                                                            Ch {ch.channel_number}: {ch.frequency || "—"}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {mic.notes && (
                                                <p className="text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded">
                                                    {mic.notes}
                                                </p>
                                            )}

                                            {canManage && (
                                                <div className="pt-1.5 border-t border-border flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(mic)}>
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1" onClick={() => handleDelete(mic)}>
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </>
                )}
            </main>

            {/* Add/Edit Receiver Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Radio className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">{editTarget ? "Edit Receiver" : "Add Receiver"}</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowForm(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            {formError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{formError}</p>}

                            <div className="space-y-2">
                                <Label htmlFor="receiver-model">Receiver Model / Brand <span className="text-destructive">*</span></Label>
                                <Input id="receiver-model" required value={form.brand_model}
                                    onChange={e => setForm(f => ({ ...f, brand_model: e.target.value }))}
                                    placeholder="e.g. Shure ULXD4D, Sennheiser EW-D" />
                            </div>

                            {/* Receiver Type Field: Digital or Analog */}
                            <div className="space-y-2">
                                <Label>Receiver Type <span className="text-destructive">*</span></Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type: "Digital" }))}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${form.type === "Digital"
                                            ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30"
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                            }`}
                                    >
                                        <Cpu className="w-4 h-4" />
                                        Digital
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type: "Analog" }))}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${form.type === "Analog"
                                            ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30"
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                            }`}
                                    >
                                        <Radio className="w-4 h-4" />
                                        Analog
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="receiver-channels">Number of Channels <span className="text-destructive">*</span></Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="receiver-channels"
                                        type="number"
                                        min={1}
                                        max={32}
                                        value={form.channels_count}
                                        onChange={e => updateChannelsCount(parseInt(e.target.value) || 1)}
                                        className="w-28"
                                    />
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 4, 8].map(n => (
                                            <Button
                                                key={n}
                                                type="button"
                                                variant={form.channels_count === n ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => updateChannelsCount(n)}
                                                className="h-8 px-2.5 text-xs"
                                            >
                                                {n} Ch
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Channel & Frequency Fields */}
                            <div className="space-y-3 pt-2 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-primary" /> Channel Frequencies ({form.channels.length})
                                    </Label>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {form.channels.map((ch, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-border">
                                            <div className="w-24 shrink-0 text-xs font-medium text-foreground flex items-center gap-1">
                                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                    {ch.channel_number}
                                                </span>
                                                Channel {ch.channel_number}
                                            </div>
                                            <Input
                                                value={ch.frequency}
                                                onChange={e => handleChannelFreqChange(idx, e.target.value)}
                                                placeholder={`e.g. 518.125 MHz`}
                                                className="flex-1 text-sm bg-card"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border">
                                <Label htmlFor="receiver-location">Location <span className="text-destructive">*</span></Label>
                                <Input id="receiver-location" required value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Chapel, Studio A, Main Hall" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="receiver-notes">Notes</Label>
                                <Input id="receiver-notes" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Optional notes or details" />
                            </div>
                        </div>

                        <div className="p-4 border-t border-border flex gap-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button className="flex-1" disabled={saving} onClick={handleSave}>
                                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {editTarget ? "Save Changes" : "Add Receiver"}
                            </Button>
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

export default function ReceiverManagementPageWrapper() {
    return (
        <RoleProtectedRoute allowedRoles={["admin", "coordinator", "supervisor", "student"]}>
            <DashboardSidebarWrapper>
                <ReceiverManagementPage />
            </DashboardSidebarWrapper>
        </RoleProtectedRoute>
    )
}
