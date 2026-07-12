"use client"

import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Menu, RefreshCw, Search, X, CheckCircle, CalendarX, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

import { CustomerSidebar } from "@/components/CustomerSidebar"
import { BookingForm } from "@/components/BookingForm"
import { BookingCard } from "@/components/BookingCard"
import { CancelBookingDialog } from "@/components/CancelBookingDialog"
import { NotificationDropdown } from "@/components/NotificationDropdown"

import {
    getStoredUser,
    hasAnyRole,
    formatAPIError,
    authAPI,
    mediaBookingAPI,
    userAPI,
    type MediaBooking,
} from "@/lib/api"

// â”€â”€â”€ Status filter options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_FILTERS = [
    { value: 'requested', label: 'Requested' },
    { value: 'approved', label: 'Approved' },
    { value: 'canceled', label: 'Canceled' },
    { value: 'completed', label: 'Completed' },
]

// â”€â”€â”€ Main Dashboard Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CustomerDashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentUser = useMemo(() => getStoredUser(), [])
    const activeTab = searchParams.get('tab') === 'my-bookings' ? 'my-bookings' : 'book'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showAssistantDialog, setShowAssistantDialog] = useState(false)
    const [assistantRequestLoading, setAssistantRequestLoading] = useState(false)

    const isPureCustomer = !!currentUser && ((currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role]).filter(Boolean).every(role => role.toLowerCase() === 'customer'))

    const handleRequestAvAssistant = async () => {
        setAssistantRequestLoading(true)
        try {
            await userAPI.requestAvAssistant()
            await authAPI.logout()
            router.push(`/login?error=${encodeURIComponent('Your AV assistant request has been submitted and is pending admin approval.')}`)
        } catch (err) {
            console.error('Failed to submit AV assistant request:', err)
            router.push(`/login?error=${encodeURIComponent('Your AV assistant request is pending admin approval.')}`)
        } finally {
            setAssistantRequestLoading(false)
        }
    }


    const handleTabChange = (tab: "book" | "my-bookings") => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.push(`/dashboard/customer?${params.toString()}`)
    }

    // Auth check
    useEffect(() => {
        if (!currentUser || !hasAnyRole(['customer'])) {
            router.push('/login')
        }
    }, [currentUser, router])

    if (!currentUser) {
        return <div className="flex items-center justify-center h-screen text-muted-foreground">Loadingâ€¦</div>
    }
    return (
        <div className="flex h-screen bg-background">
            <CustomerSidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={currentUser}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="bg-card/70 backdrop-blur-xl border-b border-border px-6 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost" size="icon"
                                className="md:hidden"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold text-foreground">
                                    {activeTab === 'book' ? 'Book Media Service' : 'My Bookings'}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {activeTab === 'book'
                                        ? 'Submit a new media service booking request'
                                        : 'Track and manage your booking requests'}
                                </p>
                                {isPureCustomer && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 border-primary/20 text-primary dark:text-white hover:bg-primary/10"
                                        onClick={() => setShowAssistantDialog(true)}
                                    >
                                        Become an AV Assistant
                                    </Button>
                                )}
                            </div>
                        </div>
                        <NotificationDropdown />
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6">
                    {activeTab === 'book' && <BookMediaTab onBookingCreated={() => handleTabChange('my-bookings')} />}
                    {activeTab === 'my-bookings' && <MyBookingsTab />}
                </main>
            </div>

            <Dialog open={showAssistantDialog} onOpenChange={setShowAssistantDialog}>
                <DialogContent className="max-w-[90vw] sm:max-w-sm bg-card text-card-foreground p-0 gap-0 rounded-2xl">
                    <div className="m-3 sm:m-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 sm:p-5">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">Become an AV Assistant</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                    Make sure to apply for AV job on SARRA2 or contact the department director first before you proceed.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
                        <Button variant="outline" onClick={() => setShowAssistantDialog(false)} disabled={assistantRequestLoading} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleRequestAvAssistant} disabled={assistantRequestLoading} className="flex-1">
                            {assistantRequestLoading ? 'Processing...' : 'Proceed'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// â”€â”€â”€ Book Media Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BookMediaTab({ onBookingCreated }: { onBookingCreated: () => void }) {
    const [submitted, setSubmitted] = useState(false)
    const [createdBooking, setCreatedBooking] = useState<MediaBooking | null>(null)

    const handleSuccess = (booking: MediaBooking) => {
        setCreatedBooking(booking)
        setSubmitted(true)
    }

    if (submitted && createdBooking) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-green-900 dark:text-green-200">Booking Submitted!</h2>
                    <p className="text-sm text-green-800 dark:text-green-300">
                        Your booking for <strong>{createdBooking.event_name}</strong> has been received. <strong>Please wait for the confirmation.</strong> Our coordination team will review your request and confirm it shortly.
                    </p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="outline" onClick={() => { setSubmitted(false); setCreatedBooking(null) }}>
                            Book Another
                        </Button>
                        <Button onClick={onBookingCreated}>
                            View My Bookings
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto bg-card/80 backdrop-blur-xl rounded-xl border border-border p-6">
            <BookingForm
                onSuccess={handleSuccess}
                onCancel={() => { /* no-op: can't cancel in tab mode */ }}
            />
        </div>
    )
}

// â”€â”€â”€ My Bookings Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MyBookingsTab() {
    const [bookings, setBookings] = useState<MediaBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('requested')
    const [searchQuery, setSearchQuery] = useState('')

    // Edit booking
    const [editingBooking, setEditingBooking] = useState<MediaBooking | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    // Cancel booking
    const [cancelingBooking, setCancelingBooking] = useState<MediaBooking | null>(null)
    const [cancelLoading, setCancelLoading] = useState(false)

    const fetchBookings = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await mediaBookingAPI.getBookings({
                status: statusFilter,
                per_page: 50,
            })
            setBookings(res.data ?? res)
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { fetchBookings() }, [fetchBookings])

    const handleCancelConfirm = async (reason: string) => {
        if (!cancelingBooking) return
        setCancelLoading(true)
        try {
            await mediaBookingAPI.cancelBooking(cancelingBooking.id, reason)
            setCancelingBooking(null)
            fetchBookings()
        } catch (err) {
            setError(formatAPIError(err))
        } finally {
            setCancelLoading(false)
        }
    }

    const handleEditSuccess = () => {
        setEditDialogOpen(false)
        setEditingBooking(null)
        fetchBookings()
    }

    const logicalStatusForBooking = (booking: MediaBooking) => {
        switch (booking.status) {
            case 'booking':
            case 'to_assign':
            case 'pending':
                return 'requested'
            case 'confirmed':
                return 'approved'
            case 'complete':
                return 'completed'
            case 'canceled':
                return 'canceled'
            default:
                return booking.status
        }
    }

    const displayedBookings = bookings.filter(b => {
        const matchesStatus = logicalStatusForBooking(b) === statusFilter

        if (!matchesStatus) return false

        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            b.event_name.toLowerCase().includes(q) ||
            b.location.toLowerCase().includes(q)
        )
    })

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Filters */}
            <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-4">
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                  ${statusFilter === f.value
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by event or location…"
                                className="pl-9 bg-background/50"
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchBookings} title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bookings list */}
            <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-4 md:p-6">
                {loading ? (
                    <div className="py-16 text-center text-muted-foreground">Loading bookings…</div>
                ) : error ? (
                    <div className="py-8 text-center text-destructive">{error}</div>
                ) : displayedBookings.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                        <CalendarX className="w-12 h-12 mx-auto text-muted-foreground/40" />
                        <p className="text-muted-foreground">No bookings found.</p>
                        {statusFilter !== 'requested' && (
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('requested')}>
                                <X className="w-4 h-4 mr-1" /> Clear filter
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedBookings.map(booking => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                showCustomer={false}
                                customerView
                                onEdit={b => { setEditingBooking(b); setEditDialogOpen(true) }}
                                onCancel={b => setCancelingBooking(b)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Booking Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={v => { if (!v) { setEditDialogOpen(false); setEditingBooking(null) } }}>
                <DialogContent className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Booking</DialogTitle>
                    </DialogHeader>
                    {editingBooking && (
                        <BookingForm
                            editingBooking={editingBooking}
                            onSuccess={handleEditSuccess}
                            onCancel={() => { setEditDialogOpen(false); setEditingBooking(null) }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancel Booking Dialog */}
            <CancelBookingDialog
                isOpen={!!cancelingBooking}
                onClose={() => setCancelingBooking(null)}
                onConfirm={handleCancelConfirm}
                loading={cancelLoading}
            />
        </div>
    )
}

// â”€â”€â”€ Page Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CustomerDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>}>
            <CustomerDashboardContent />
        </Suspense>
    )
}






