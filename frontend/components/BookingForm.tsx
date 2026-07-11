"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
    AlertCircle,
    MapPin,
    Clock,
    CalendarIcon,
    FileText,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Info,
} from "lucide-react"
import { mediaBookingAPI, type MediaBooking } from "@/lib/api"

interface BookingFormProps {
    onSuccess: (booking: MediaBooking) => void
    onCancel: () => void
    editingBooking?: MediaBooking | null
}

const statusColors: Record<string, string> = {
    to_assign: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function BookingForm({ onSuccess, onCancel, editingBooking }: BookingFormProps) {
    const isEditing = !!editingBooking
    const [step, setStep] = useState(isEditing ? 2 : 1)

    // Location
    const [locations, setLocations] = useState<string[]>([])
    const [selectedLocation, setSelectedLocation] = useState(editingBooking?.location ?? "")
    const [customLocation, setCustomLocation] = useState("")

    // Date / Time
    const [selectedDate, setSelectedDate] = useState<string>(
        editingBooking ? editingBooking.start_datetime.slice(0, 10) : ""
    )
    const [startTime, setStartTime] = useState(
        editingBooking ? editingBooking.start_datetime.slice(11, 16) : ""
    )
    const [endTime, setEndTime] = useState(
        editingBooking ? editingBooking.end_datetime.slice(11, 16) : ""
    )
    const [existingBookings, setExistingBookings] = useState<MediaBooking[]>([])

    // Details
    const [eventName, setEventName] = useState(editingBooking?.event_name ?? "")
    const [equipmentRequest, setEquipmentRequest] = useState(editingBooking?.equipment_request ?? "")
    const [acRequired, setAcRequired] = useState(editingBooking?.ac_required ?? false)
    const [spotlightRequired, setSpotlightRequired] = useState(editingBooking?.spotlight_required ?? false)
    const [ledLightRequired, setLedLightRequired] = useState(editingBooking?.led_light_required ?? false)

    // UI state
    const [loading, setLoading] = useState(false)
    const [fetchingAvailability, setFetchingAvailability] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Minimum date: day after tomorrow (must book at least 1 day in advance)
    const minDate = (() => {
        const d = new Date()
        d.setDate(d.getDate() + 2)
        return d.toISOString().slice(0, 10)
    })()

    const effectiveLocation = selectedLocation === '__custom__' ? customLocation : selectedLocation

    // Load locations on mount
    useEffect(() => {
        mediaBookingAPI.getLocations()
            .then(r => setLocations(r.locations))
            .catch(() => { })
    }, [])

    // Reload availability whenever location or date changes
    useEffect(() => {
        if (effectiveLocation && selectedDate) {
            setFetchingAvailability(true)
            mediaBookingAPI.checkAvailability(effectiveLocation, selectedDate)
                .then(r => setExistingBookings(
                    r.bookings.filter(b => b.id !== editingBooking?.id)
                ))
                .catch(() => setExistingBookings([]))
                .finally(() => setFetchingAvailability(false))
        } else {
            setExistingBookings([])
        }
    }, [effectiveLocation, selectedDate])

    const handleSubmit = async () => {
        if (!effectiveLocation || !selectedDate || !startTime || !endTime || !eventName) {
            setError("Please fill in all required fields.")
            return
        }
        if (startTime >= endTime) {
            setError("End time must be after start time.")
            return
        }

        const data = {
            event_name: eventName,
            location: effectiveLocation,
            start_datetime: `${selectedDate}T${startTime}:00`,
            end_datetime: `${selectedDate}T${endTime}:00`,
            equipment_request: equipmentRequest || undefined,
            ac_required: acRequired,
            spotlight_required: spotlightRequired,
            led_light_required: ledLightRequired,
        }

        setLoading(true)
        setError(null)
        try {
            let result
            if (isEditing) {
                result = await mediaBookingAPI.updateBooking(editingBooking!.id, data)
            } else {
                result = await mediaBookingAPI.createBooking(data)
            }
            onSuccess(result.booking)
        } catch (err: any) {
            const apiError = err?.errors
                ? Object.values(err.errors).flat().join('\n')
                : err?.message
            setError(apiError || "Failed to submit booking.")
        } finally {
            setLoading(false)
        }
    }

    // ─── Step 1: Info Notice ────────────────────────────────────────
    const StepInfo = () => (
        <div className="space-y-6">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-5">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200">Before You Book</h3>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            This booking form is for <strong>media services only</strong> (cameras, audio equipment, lighting setup, etc.).
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            If you want to <strong>book only the room</strong>, please contact the plant service department directly.
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            Bookings must be submitted <strong>at least one day in advance</strong>.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex justify-between">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => setStep(2)}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    )

    // ─── Step 2: Location ────────────────────────────────────────────
    const StepLocation = () => (
        <div className="space-y-5">
            <div>
                <Label className="text-foreground font-medium mb-2 block">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Select Location *
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {locations.map(loc => (
                        <button
                            key={loc}
                            type="button"
                            onClick={() => { setSelectedLocation(loc); setCustomLocation("") }}
                            className={`p-3 rounded-lg text-sm font-medium text-left border transition-all
                ${selectedLocation === loc && selectedLocation !== '__custom__'
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-muted/50 text-foreground border-border hover:border-primary/50 hover:bg-muted'
                                }`}
                        >
                            {loc}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setSelectedLocation('__custom__')}
                        className={`p-3 rounded-lg text-sm font-medium text-left border transition-all
              ${selectedLocation === '__custom__'
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/50 text-foreground border-border hover:border-primary/50 hover:bg-muted'
                            }`}
                    >
                        Other…
                    </button>
                </div>

                {selectedLocation === '__custom__' && (
                    <Input
                        className="mt-3 bg-background/50"
                        placeholder="Enter location name"
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        autoFocus
                    />
                )}
            </div>

            <div className="flex justify-between">
                {!isEditing ? (
                    <Button variant="outline" onClick={() => setStep(1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                ) : (
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                )}
                <Button
                    onClick={() => setStep(3)}
                    disabled={!effectiveLocation}
                >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    )

    // ─── Step 3: Date & Time ─────────────────────────────────────────
    const StepDateTime = () => (
        <div className="space-y-5">
            <div>
                <Label className="text-foreground font-medium mb-2 block">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Date *
                </Label>
                <Input
                    type="date"
                    value={selectedDate}
                    min={minDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-background/50 max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Earliest bookable date: {minDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-foreground font-medium mb-2 block">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Start Time *
                    </Label>
                    <Input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="bg-background/50"
                    />
                </div>
                <div>
                    <Label className="text-foreground font-medium mb-2 block">End Time *</Label>
                    <Input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="bg-background/50"
                    />
                </div>
            </div>

            {/* Existing bookings for conflict visibility */}
            {selectedDate && effectiveLocation && (
                <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                        Existing bookings at <span className="text-primary">{effectiveLocation}</span> on {selectedDate}:
                    </p>
                    {fetchingAvailability ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Checking availability...
                        </div>
                    ) : existingBookings.length === 0 ? (
                        <p className="text-sm text-green-600 dark:text-green-400">✓ No existing bookings — slot is available!</p>
                    ) : (
                        <div className="space-y-2">
                            {existingBookings.map(b => (
                                <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                    <span className="font-medium text-foreground truncate flex-1">{b.event_name}</span>
                                    <span className="text-muted-foreground shrink-0">
                                        {new Date(b.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {' – '}
                                        {new Date(b.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <Badge className={`text-xs px-1.5 border-none shrink-0 ${statusColors[b.status]}`}>
                                        {b.status}
                                    </Badge>
                                </div>
                            ))}
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Choose a time that doesn't overlap with existing bookings.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                    onClick={() => setStep(4)}
                    disabled={!selectedDate || !startTime || !endTime}
                >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    )

    // ─── Step 4: Event Details ───────────────────────────────────────
    const StepDetails = () => (
        <div className="space-y-5">
            <div>
                <Label htmlFor="event-name" className="text-foreground font-medium">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Event Name *
                </Label>
                <Input
                    id="event-name"
                    placeholder="e.g. Annual Company Meeting"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="mt-1 bg-background/50"
                />
            </div>

            <div>
                <Label htmlFor="equipment-request" className="text-foreground font-medium">Equipment Request</Label>
                <textarea
                    id="equipment-request"
                    placeholder="e.g. 4 wireless mics, 2 cameras, projector"
                    value={equipmentRequest}
                    onChange={e => setEquipmentRequest(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
            </div>

            <div>
                <p className="text-sm font-medium text-foreground mb-3">Additional Requirements</p>
                <div className="space-y-3">
                    {[
                        { id: 'ac', label: 'AC (Air Conditioning)', checked: acRequired, onChange: setAcRequired },
                        { id: 'spotlight', label: 'Spotlight (Follow Light)', checked: spotlightRequired, onChange: setSpotlightRequired },
                        { id: 'led', label: 'LED Light', checked: ledLightRequired, onChange: setLedLightRequired },
                    ].map(({ id, label, checked, onChange }) => (
                        <div key={id} className="flex items-center gap-3">
                            <Checkbox
                                id={id}
                                checked={checked}
                                onCheckedChange={v => onChange(v === true)}
                            />
                            <Label htmlFor={id} className="text-foreground cursor-pointer">{label}</Label>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Note: Celine light will be turned on automatically.
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{error}</span>
                </div>
            )}

            {/* Summary */}
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
                <p className="font-medium text-foreground mb-2">Booking Summary</p>
                <p><span className="text-muted-foreground">Location:</span> {effectiveLocation}</p>
                <p><span className="text-muted-foreground">Date:</span> {selectedDate}</p>
                <p><span className="text-muted-foreground">Time:</span> {startTime} – {endTime}</p>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setError(null); setStep(3) }}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !eventName}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Submit Booking'}
                </Button>
            </div>
        </div>
    )

    const stepLabels = isEditing
        ? ['Location', 'Date & Time', 'Details']
        : ['Notice', 'Location', 'Date & Time', 'Details']
    const totalSteps = isEditing ? 3 : 4
    const displayStep = isEditing ? step - 1 : step

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                {stepLabels.map((label, i) => {
                    const num = i + 1
                    const isActive = displayStep === num
                    const isDone = displayStep > num
                    return (
                        <div key={label} className="flex items-center gap-2 flex-1">
                            <div className={`flex items-center gap-1.5 ${isActive ? 'text-primary' : isDone ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive ? 'bg-primary text-primary-foreground'
                                        : isDone ? 'bg-green-600 dark:bg-green-700 text-white'
                                            : 'bg-muted text-muted-foreground'}`}>
                                    {isDone ? '✓' : num}
                                </div>
                                <span className="text-xs font-medium hidden sm:block">{label}</span>
                            </div>
                            {i < stepLabels.length - 1 && (
                                <div className={`flex-1 h-px ${isDone ? 'bg-green-400' : 'bg-border'}`} />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Step content */}
            {step === 1 && !isEditing && <StepInfo />}
            {step === 2 && <StepLocation />}
            {step === 3 && <StepDateTime />}
            {step === 4 && <StepDetails />}
        </div>
    )
}
