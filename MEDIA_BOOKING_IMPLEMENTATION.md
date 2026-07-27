
# Media Service Booking Feature — Step-by-Step Implementation Guide

> **Senior Developer Notes:**  
> This guide details every file to create or modify to implement the Media Service Booking feature. The project uses **Laravel (backend)** with Spatie Permissions and **Next.js (frontend)** with Tailwind CSS. Follow each step in order — database → backend → frontend — to avoid dependency issues.

---

## Overview of What We're Building

| Feature | Description |
|---|---|
| New role: `customer` | Can only book media services and manage their own bookings |
| Booking system | Location-based, time-conflict-aware, 1-day advance required |
| Booking form | Event name, equipment request, AC/Spotlight/LED checkboxes |
| New assignment statuses | `to_assign` and `canceled` for coordinators |
| Auto-assignment creation | Every new booking auto-creates a `to_assign` assignment |
| Notifications | Email + in-app for customer, all coordinators, and supervisors |
| Coordinator tools | Cancel booking, contact customer buttons in `to_assign` view |
| Customer booking management | Edit/Cancel with reason, confirmation dialogs on every change |

---

## Phase 1: Database — Backend Migrations & Seeders

### Step 1.1 — Create the `media_bookings` table

**File to create:** `backend/database/migrations/2026_07_11_000001_create_media_bookings_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_name');
            $table->string('location');                   // e.g. "Studio A", "Room 201"
            $table->dateTime('start_datetime');
            $table->dateTime('end_datetime');
            $table->text('equipment_request')->nullable(); // free-text, e.g. "4 wireless mics"
            $table->boolean('ac_required')->default(false);
            $table->boolean('spotlight_required')->default(false);
            $table->boolean('led_light_required')->default(false);
            $table->string('status')->default('pending');
            // status values: 'pending', 'to_assign', 'confirmed', 'canceled', 'complete'
            $table->text('cancel_reason')->nullable();
            $table->string('canceled_by')->nullable(); // 'customer' | 'coordinator'
            $table->foreignUuid('assignment_id')->nullable()->constrained('assignments')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_bookings');
    }
};
```

### Step 1.2 — Add `to_assign` and `canceled` to assignments status enum

**File to create:** `backend/database/migrations/2026_07_11_000002_add_to_assign_canceled_to_assignments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // If using MySQL ENUM column, alter it; otherwise the string column already supports any value.
        // Check assignments table - if status is a VARCHAR/string, no migration needed for the column itself.
        // Just add a note: the new valid string values are 'to_assign' and 'canceled'.
        // This migration is a placeholder to document the change if the column is a string type.
        // If the column is ENUM, run:
        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete','to_assign','canceled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete') NOT NULL DEFAULT 'pending'");
    }
};
```

> **Note:** If your `assignments.status` column is already a plain `VARCHAR`/`string`, skip this migration — the new values will work automatically.

### Step 1.3 — Add `customer` role in the Seeder / Role setup

**File to modify:** `backend/database/seeders/RoleAndPermissionSeeder.php`  
*(If the file doesn't exist yet, look in `DatabaseSeeder.php` for where roles are seeded.)*

Add `'customer'` to the roles array:

```php
$roles = ['admin', 'supervisor', 'coordinator', 'student', 'customer'];

foreach ($roles as $role) {
    \Spatie\Permission\Models\Role::firstOrCreate(['name' => $role]);
}
```

Also update the `users` table enum if it has a role column with ENUM:

**File to create:** `backend/database/migrations/2026_07_11_000003_add_customer_to_users_role_enum.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','coordinator','student','customer') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','coordinator','student') NULL");
    }
};
```

---

## Phase 2: Backend — Models, Controllers, Requests, Notifications, Mail

### Step 2.1 — Create the `MediaBooking` Model

**File to create:** `backend/app/Models/MediaBooking.php`

```php
<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MediaBooking extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'customer_id',
        'event_name',
        'location',
        'start_datetime',
        'end_datetime',
        'equipment_request',
        'ac_required',
        'spotlight_required',
        'led_light_required',
        'status',
        'cancel_reason',
        'canceled_by',
        'assignment_id',
    ];

    protected $casts = [
        'start_datetime'     => 'datetime',
        'end_datetime'       => 'datetime',
        'ac_required'        => 'boolean',
        'spotlight_required' => 'boolean',
        'led_light_required' => 'boolean',
    ];

    /** Customer who made this booking */
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /** The assignment auto-created for this booking */
    public function assignment()
    {
        return $this->belongsTo(Assignment::class, 'assignment_id');
    }

    /**
     * Check if the given location + time slot is already booked.
     * Same location cannot have overlapping bookings.
     * Same time + different location IS allowed.
     */
    public static function hasConflict(string $location, string $start, string $end, ?string $excludeId = null): bool
    {
        $query = static::where('location', $location)
            ->whereNotIn('status', ['canceled'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_datetime', [$start, $end])
                  ->orWhereBetween('end_datetime', [$start, $end])
                  ->orWhere(function ($inner) use ($start, $end) {
                      $inner->where('start_datetime', '<=', $start)
                            ->where('end_datetime', '>=', $end);
                  });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
```

### Step 2.2 — Add `mediaBookings` relationship to User model

**File to modify:** `backend/app/Models/User.php`

Add the following method inside the `User` class (after the existing `availability()` method):

```php
/** Media bookings made by this customer */
public function mediaBookings()
{
    return $this->hasMany(MediaBooking::class, 'customer_id');
}

/** Check if user is a customer */
public function isCustomer(): bool
{
    return $this->hasRole('customer');
}
```

### Step 2.3 — Create Form Request: StoreMediaBookingRequest

**File to create:** `backend/app/Http/Requests/MediaBooking/StoreMediaBookingRequest.php`

```php
<?php

namespace App\Http\Requests\MediaBooking;

use Illuminate\Foundation\Http\FormRequest;
use Carbon\Carbon;

class StoreMediaBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->hasRole('customer');
    }

    public function rules(): array
    {
        return [
            'event_name'        => 'required|string|max:255',
            'location'          => 'required|string|max:255',
            'start_datetime'    => 'required|date|after:tomorrow',
            // "booking must be made one day before" → start must be after tomorrow (i.e. ≥ day after today)
            'end_datetime'      => 'required|date|after:start_datetime',
            'equipment_request' => 'nullable|string|max:1000',
            'ac_required'       => 'boolean',
            'spotlight_required'=> 'boolean',
            'led_light_required'=> 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'start_datetime.after' => 'Booking must be made at least one day in advance.',
        ];
    }
}
```

### Step 2.4 — Create Form Request: UpdateMediaBookingRequest

**File to create:** `backend/app/Http/Requests/MediaBooking/UpdateMediaBookingRequest.php`

```php
<?php

namespace App\Http\Requests\MediaBooking;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMediaBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $booking = $this->route('mediaBooking');
        // Only the customer who made the booking can edit it
        return auth()->check() &&
               auth()->user()->hasRole('customer') &&
               $booking->customer_id === auth()->id();
    }

    public function rules(): array
    {
        return [
            'event_name'        => 'sometimes|required|string|max:255',
            'location'          => 'sometimes|required|string|max:255',
            'start_datetime'    => 'sometimes|required|date|after:tomorrow',
            'end_datetime'      => 'sometimes|required|date|after:start_datetime',
            'equipment_request' => 'nullable|string|max:1000',
            'ac_required'       => 'boolean',
            'spotlight_required'=> 'boolean',
            'led_light_required'=> 'boolean',
        ];
    }
}
```

### Step 2.5 — Create the Notifications

#### 2.5a — BookingCreatedCustomerNotification (to the customer who booked)

**File to create:** `backend/app/Notifications/BookingCreatedCustomerNotification.php`

```php
<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingCreatedCustomerNotification extends Notification
{
    use Queueable;

    public function __construct(public MediaBooking $booking) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('Booking Confirmed!')
            ->icon('/icons/icon-192x192.png')
            ->body('Your booking for "' . $this->booking->event_name . '" has been received.')
            ->data(['url' => '/dashboard/customer?tab=my-bookings']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Media Service Booking Has Been Received')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Your booking has been successfully submitted.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i') . ' – ' . $this->booking->end_datetime->format('H:i'))
            ->line('Our coordination team will review and assign staff shortly.')
            ->action('View My Bookings', url('/dashboard/customer?tab=my-bookings'))
            ->line('Thank you for using our media service.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message'    => 'Your booking for "' . $this->booking->event_name . '" has been submitted.',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_created',
            'url'        => '/dashboard/customer?tab=my-bookings',
        ];
    }
}
```

#### 2.5b — BookingCreatedStaffNotification (to all coordinators and supervisors)

**File to create:** `backend/app/Notifications/BookingCreatedStaffNotification.php`

```php
<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingCreatedStaffNotification extends Notification
{
    use Queueable;

    public function __construct(public MediaBooking $booking) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('New Media Booking Request')
            ->icon('/icons/icon-192x192.png')
            ->body('New booking: "' . $this->booking->event_name . '" at ' . $this->booking->location)
            ->data(['url' => '/dashboard/coordinator?tab=assignments&filter=to_assign']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $customer = $this->booking->customer;
        return (new MailMessage)
            ->subject('New Media Booking: ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('A new media service booking has been submitted and requires assignment.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i') . ' – ' . $this->booking->end_datetime->format('H:i'))
            ->line('**Requested By:** ' . $customer->name . ' (' . $customer->email . ')')
            ->line('**Equipment Request:** ' . ($this->booking->equipment_request ?? 'None'))
            ->action('View Bookings', url('/dashboard/coordinator?tab=assignments&filter=to_assign'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message'    => 'New booking from ' . $this->booking->customer->name . ': "' . $this->booking->event_name . '"',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_created_staff',
            'url'        => '/dashboard/coordinator?tab=assignments&filter=to_assign',
        ];
    }
}
```

#### 2.5c — BookingUpdatedNotification (for edit/cancel changes)

**File to create:** `backend/app/Notifications/BookingUpdatedNotification.php`

```php
<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingUpdatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MediaBooking $booking,
        public string $changeType, // 'edited' | 'canceled'
        public ?string $reason = null,
        public bool $isForCustomer = false
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        $action = $this->changeType === 'canceled' ? 'Canceled' : 'Updated';
        return (new WebPushMessage)
            ->title('Booking ' . $action)
            ->icon('/icons/icon-192x192.png')
            ->body('Booking "' . $this->booking->event_name . '" has been ' . strtolower($action) . '.')
            ->data(['url' => $this->isForCustomer
                ? '/dashboard/customer?tab=my-bookings'
                : '/dashboard/coordinator?tab=assignments']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $action = $this->changeType === 'canceled' ? 'Canceled' : 'Updated';
        $customer = $this->booking->customer;

        $mail = (new MailMessage)
            ->subject('Media Booking ' . $action . ': ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('The following media service booking has been **' . strtolower($action) . '**.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i'));

        if (!$this->isForCustomer) {
            $mail->line('**Customer:** ' . $customer->name . ' (' . $customer->email . ')');
        }

        if ($this->reason) {
            $mail->line('**Reason:** ' . $this->reason);
        }

        return $mail->action('View Details', url($this->isForCustomer
            ? '/dashboard/customer?tab=my-bookings'
            : '/dashboard/coordinator?tab=assignments'));
    }

    public function toArray(object $notifiable): array
    {
        $action = $this->changeType === 'canceled' ? 'canceled' : 'updated';
        return [
            'message'    => 'Booking "' . $this->booking->event_name . '" has been ' . $action . '.',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_' . $action,
            'url'        => $this->isForCustomer
                ? '/dashboard/customer?tab=my-bookings'
                : '/dashboard/coordinator?tab=assignments',
        ];
    }
}
```

### Step 2.6 — Create the MediaBookingController

**File to create:** `backend/app/Http/Controllers/Api/MediaBookingController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MediaBooking\StoreMediaBookingRequest;
use App\Http\Requests\MediaBooking\UpdateMediaBookingRequest;
use App\Models\Assignment;
use App\Models\MediaBooking;
use App\Models\User;
use App\Notifications\BookingCreatedCustomerNotification;
use App\Notifications\BookingCreatedStaffNotification;
use App\Notifications\BookingUpdatedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MediaBookingController extends Controller
{
    /**
     * List all bookings (for coordinator/supervisor view) or
     * just the authenticated customer's bookings.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->hasRole('customer')) {
            $query = MediaBooking::where('customer_id', $user->id)->with('customer', 'assignment');
        } else {
            // coordinators / supervisors / admin see all
            $query = MediaBooking::with('customer', 'assignment');
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by location (for showing existing bookings on calendar)
        if ($request->has('location')) {
            $query->where('location', $request->location);
        }

        // Filter by date range
        if ($request->has('date')) {
            $query->whereDate('start_datetime', $request->date);
        }

        $perPage = $request->get('per_page', 20);
        $bookings = $query->orderBy('start_datetime', 'asc')->paginate($perPage);

        return response()->json($bookings);
    }

    /**
     * Return all distinct booking locations (for the location picker).
     */
    public function locations(): JsonResponse
    {
        $locations = MediaBooking::whereNotIn('status', ['canceled'])
            ->distinct()
            ->pluck('location');

        // You may also return a hard-coded list of known locations:
        $predefinedLocations = [
            'Studio A',
            'Studio B',
            'Auditorium',
            'Room 201',
            'Room 202',
            'Outdoor Stage',
        ];

        $allLocations = $locations->merge($predefinedLocations)->unique()->values();

        return response()->json(['locations' => $allLocations]);
    }

    /**
     * Check availability for a location + time slot.
     * Returns existing bookings for the chosen location on a given date.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'location' => 'required|string',
            'date'     => 'required|date',
        ]);

        $bookings = MediaBooking::where('location', $request->location)
            ->whereNotIn('status', ['canceled'])
            ->whereDate('start_datetime', $request->date)
            ->get(['id', 'event_name', 'start_datetime', 'end_datetime', 'status']);

        return response()->json(['bookings' => $bookings]);
    }

    /**
     * Store a new booking.
     */
    public function store(StoreMediaBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['customer_id'] = auth()->id();
        $data['status'] = 'to_assign';

        // Check for time conflict at the same location
        if (MediaBooking::hasConflict($data['location'], $data['start_datetime'], $data['end_datetime'])) {
            return response()->json([
                'message' => 'This location is already booked for the selected time. Please choose a different time or location.',
                'errors'  => ['start_datetime' => ['Time conflict detected for this location.']],
            ], 422);
        }

        DB::beginTransaction();
        try {
            $booking = MediaBooking::create($data);

            // Auto-create an Assignment with 'to_assign' status
            $assignment = Assignment::create([
                'assignment_name'     => 'Media Booking: ' . $booking->event_name,
                'event_name'          => $booking->event_name,
                'event_location'      => $booking->location,
                'event_start_datetime'=> $booking->start_datetime,
                'event_end_datetime'  => $booking->end_datetime,
                'description'         => $this->buildDescription($booking),
                'status'              => 'to_assign',
                'created_by'          => auth()->id(),
            ]);

            // Link assignment to booking
            $booking->update(['assignment_id' => $assignment->id]);

            DB::commit();

            // --- Send notifications ---
            $customer = auth()->user();

            // 1. Notify the customer
            $customer->notify(new BookingCreatedCustomerNotification($booking));

            // 2. Notify all coordinators and supervisors
            $staff = User::role(['coordinator', 'supervisor'])->get();
            foreach ($staff as $staffMember) {
                $staffMember->notify(new BookingCreatedStaffNotification($booking->fresh(['customer'])));
            }

            return response()->json([
                'message' => 'Booking submitted successfully. You will receive a confirmation email.',
                'booking' => $booking->load('customer', 'assignment'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create booking: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Show a single booking.
     */
    public function show(MediaBooking $mediaBooking): JsonResponse
    {
        $user = auth()->user();

        // Customers can only see their own bookings
        if ($user->hasRole('customer') && $mediaBooking->customer_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['booking' => $mediaBooking->load('customer', 'assignment')]);
    }

    /**
     * Update a booking (customer only, their own bookings).
     */
    public function update(UpdateMediaBookingRequest $request, MediaBooking $mediaBooking): JsonResponse
    {
        // Can only edit bookings that haven't been canceled or completed
        if (in_array($mediaBooking->status, ['canceled', 'complete'])) {
            return response()->json(['message' => 'This booking cannot be edited.'], 422);
        }

        $data = $request->validated();

        // If location or time changed, re-check conflict
        $newLocation = $data['location'] ?? $mediaBooking->location;
        $newStart    = $data['start_datetime'] ?? $mediaBooking->start_datetime;
        $newEnd      = $data['end_datetime'] ?? $mediaBooking->end_datetime;

        if (MediaBooking::hasConflict($newLocation, $newStart, $newEnd, $mediaBooking->id)) {
            return response()->json([
                'message' => 'This location is already booked for the selected time.',
                'errors'  => ['start_datetime' => ['Time conflict detected for this location.']],
            ], 422);
        }

        $mediaBooking->update($data);

        // Update the linked assignment too
        if ($mediaBooking->assignment) {
            $mediaBooking->assignment->update([
                'event_name'           => $data['event_name'] ?? $mediaBooking->event_name,
                'event_location'       => $newLocation,
                'event_start_datetime' => $newStart,
                'event_end_datetime'   => $newEnd,
                'description'          => $this->buildDescription($mediaBooking->fresh()),
            ]);
        }

        // Notify coordinators and supervisors
        $staff = User::role(['coordinator', 'supervisor'])->get();
        foreach ($staff as $staffMember) {
            $staffMember->notify(new BookingUpdatedNotification($mediaBooking->fresh(['customer']), 'edited', null, false));
        }

        return response()->json([
            'message' => 'Booking updated successfully.',
            'booking' => $mediaBooking->fresh(['customer', 'assignment']),
        ]);
    }

    /**
     * Cancel a booking (customer cancels their own; coordinator cancels any).
     */
    public function cancel(Request $request, MediaBooking $mediaBooking): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $user = auth()->user();

        // Customers can only cancel their own bookings
        if ($user->hasRole('customer') && $mediaBooking->customer_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Cannot cancel already canceled bookings
        if ($mediaBooking->status === 'canceled') {
            return response()->json(['message' => 'Booking is already canceled.'], 422);
        }

        $canceledBy = $user->hasRole('customer') ? 'customer' : 'coordinator';

        $mediaBooking->update([
            'status'      => 'canceled',
            'cancel_reason' => $request->reason,
            'canceled_by' => $canceledBy,
        ]);

        // Also update the linked assignment to 'canceled' status
        if ($mediaBooking->assignment) {
            $mediaBooking->assignment->update(['status' => 'canceled']);
        }

        $bookingWithCustomer = $mediaBooking->fresh(['customer']);

        // Notify customer (if coordinator canceled) or all staff (if customer canceled)
        if ($canceledBy === 'coordinator') {
            $mediaBooking->customer->notify(
                new BookingUpdatedNotification($bookingWithCustomer, 'canceled', $request->reason, true)
            );
        }

        // Always notify all coordinators and supervisors
        $staff = User::role(['coordinator', 'supervisor'])->get();
        foreach ($staff as $staffMember) {
            $staffMember->notify(
                new BookingUpdatedNotification($bookingWithCustomer, 'canceled', $request->reason, false)
            );
        }

        return response()->json(['message' => 'Booking has been canceled.']);
    }

    /**
     * Get customer info for a booking (used by coordinator "contact customer" button).
     */
    public function customerInfo(MediaBooking $mediaBooking): JsonResponse
    {
        $user = auth()->user();
        if (!$user->hasAnyRole(['coordinator', 'supervisor', 'admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $customer = $mediaBooking->customer;
        return response()->json([
            'customer' => [
                'id'    => $customer->id,
                'name'  => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone_number,
            ]
        ]);
    }

    /** Build a description string from booking details */
    private function buildDescription(MediaBooking $booking): string
    {
        $lines = ['[Media Service Booking]'];
        if ($booking->equipment_request) {
            $lines[] = 'Equipment: ' . $booking->equipment_request;
        }
        $extras = [];
        if ($booking->ac_required) $extras[] = 'AC';
        if ($booking->spotlight_required) $extras[] = 'Spotlight (Follow Light)';
        if ($booking->led_light_required) $extras[] = 'LED Light';
        if ($extras) {
            $lines[] = 'Additional: ' . implode(', ', $extras);
        }
        $lines[] = 'Note: Celine light will be turned on.';
        return implode("\n", $lines);
    }
}
```

### Step 2.7 — Register API Routes

**File to modify:** `backend/routes/api.php`

Add the following inside the `Route::middleware(['auth:sanctum'])` group (around line 86, after the users group):

```php
// -------------------------------------------------------------------------
// Media Booking Routes
// -------------------------------------------------------------------------

// Customer: submit and manage own bookings
Route::middleware(['role:customer'])->group(function () {
    Route::post('/media-bookings', [\App\Http\Controllers\Api\MediaBookingController::class, 'store']);
    Route::put('/media-bookings/{mediaBooking}', [\App\Http\Controllers\Api\MediaBookingController::class, 'update']);
    Route::post('/media-bookings/{mediaBooking}/cancel', [\App\Http\Controllers\Api\MediaBookingController::class, 'cancel']);
});

// Coordinator / Supervisor: can also cancel any booking
Route::middleware(['role:coordinator,supervisor,admin'])->group(function () {
    Route::post('/media-bookings/{mediaBooking}/cancel', [\App\Http\Controllers\Api\MediaBookingController::class, 'cancel']);
    Route::get('/media-bookings/{mediaBooking}/customer-info', [\App\Http\Controllers\Api\MediaBookingController::class, 'customerInfo']);
});

// All authenticated users: read bookings, check availability, get locations
Route::get('/media-bookings', [\App\Http\Controllers\Api\MediaBookingController::class, 'index']);
Route::get('/media-bookings/locations', [\App\Http\Controllers\Api\MediaBookingController::class, 'locations']);
Route::get('/media-bookings/availability', [\App\Http\Controllers\Api\MediaBookingController::class, 'checkAvailability']);
Route::get('/media-bookings/{mediaBooking}', [\App\Http\Controllers\Api\MediaBookingController::class, 'show']);
```

> **Important:** Place the specific routes (`/locations`, `/availability`) **before** the `/{mediaBooking}` route to avoid Laravel route binding conflicts.

### Step 2.8 — Update Assignment status validation (Request files)

**File to check:** `backend/app/Http/Requests/Assignment/StoreAssignmentRequest.php`  
and `backend/app/Http/Requests/Assignment/UpdateAssignmentRequest.php`

Make sure the `status` validation rule accepts the new values:

```php
'status' => 'nullable|in:pending,confirmed,complete,to_assign,canceled',
```

### Step 2.9 — Update `AssignmentController` to handle `to_assign` and `canceled`

**File to modify:** `backend/app/Http/Controllers/Api/AssignmentController.php`

In the `index()` method, update the auto-complete logic to **not** auto-complete `to_assign` or `canceled` assignments:

```php
// Auto-complete past assignments (only pending/confirmed, not to_assign or canceled)
Assignment::whereIn('status', ['pending', 'confirmed'])
    ->where('event_end_datetime', '<', now())
    ->update(['status' => 'complete']);
```

Update the `scopePending`, etc. to ensure the new statuses don't interfere. Also update the `assignUser` method: when a coordinator assigns someone to a `to_assign` assignment, change its status to `pending`:

```php
// In assignUser() method, after attaching the user:
if ($assignment->status === 'to_assign') {
    $assignment->update(['status' => 'pending']);
    // Also update the linked booking
    if ($assignment->mediaBooking) {
        $assignment->mediaBooking->update(['status' => 'pending']);
    }
}
```

Add the inverse relationship on `Assignment`:

**File to modify:** `backend/app/Models/Assignment.php`

```php
/** Linked media booking if this assignment came from a booking */
public function mediaBooking()
{
    return $this->hasOne(\App\Models\MediaBooking::class, 'assignment_id');
}
```

---

## Phase 3: Frontend — API Library Updates

### Step 3.1 — Add types and API functions to `api.ts`

**File to modify:** `frontend/lib/api.ts`

#### 3.1a — Add `MediaBooking` interface (after the `Assignment` interface ~line 99):

```typescript
export interface MediaBooking {
  id: string;
  customer_id: string;
  event_name: string;
  location: string;
  start_datetime: string;
  end_datetime: string;
  equipment_request?: string | null;
  ac_required: boolean;
  spotlight_required: boolean;
  led_light_required: boolean;
  status: 'pending' | 'to_assign' | 'confirmed' | 'canceled' | 'complete';
  cancel_reason?: string | null;
  canceled_by?: 'customer' | 'coordinator' | null;
  assignment_id?: string | null;
  customer?: User;
  assignment?: Assignment;
  created_at: string;
  updated_at: string;
}

export interface MediaBookingFormData {
  event_name: string;
  location: string;
  start_datetime: string;
  end_datetime: string;
  equipment_request?: string;
  ac_required?: boolean;
  spotlight_required?: boolean;
  led_light_required?: boolean;
}
```

#### 3.1b — Update the `User` role type to include `'customer'`:

```typescript
// Change line 53 from:
role: 'admin' | 'supervisor' | 'coordinator' | 'student';
// to:
role: 'admin' | 'supervisor' | 'coordinator' | 'student' | 'customer';
```

#### 3.1c — Add `mediaBookingAPI` object (at the end of `api.ts`, before closing):

```typescript
export const mediaBookingAPI = {
  async getBookings(params: { status?: string; location?: string; date?: string; per_page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.location) query.append('location', params.location);
    if (params.date) query.append('date', params.date);
    if (params.per_page) query.append('per_page', String(params.per_page));
    const qs = query.toString();
    return apiCall<any>(`/media-bookings${qs ? '?' + qs : ''}`);
  },

  async getLocations(): Promise<{ locations: string[] }> {
    return apiCall('/media-bookings/locations');
  },

  async checkAvailability(location: string, date: string) {
    return apiCall<{ bookings: MediaBooking[] }>(
      `/media-bookings/availability?location=${encodeURIComponent(location)}&date=${date}`
    );
  },

  async createBooking(data: MediaBookingFormData): Promise<{ message: string; booking: MediaBooking }> {
    return apiCall('/media-bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBooking(id: string, data: Partial<MediaBookingFormData>): Promise<{ message: string; booking: MediaBooking }> {
    return apiCall(`/media-bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async cancelBooking(id: string, reason: string): Promise<{ message: string }> {
    return apiCall(`/media-bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getCustomerInfo(bookingId: string): Promise<{ customer: { id: string; name: string; email: string; phone: string } }> {
    return apiCall(`/media-bookings/${bookingId}/customer-info`);
  },

  async getBooking(id: string): Promise<{ booking: MediaBooking }> {
    return apiCall(`/media-bookings/${id}`);
  },
};
```

### Step 3.2 — Update `role-routing.ts` to handle the `customer` role

**File to modify:** `frontend/lib/role-routing.ts`

```typescript
// In getRoleBasedDashboardPath(), add before the student fallback:
if (roles.includes('customer')) return '/dashboard/customer';

// In canAccessDashboard(), add to rolePathMap:
'customer': ['/dashboard/customer'],

// In getAllowedDashboards(), add to rolePathMap:
'customer': ['/dashboard/customer'],
```

---

## Phase 4: Frontend — New Components

### Step 4.1 — Create `BookingForm` component

**File to create:** `frontend/components/BookingForm.tsx`

This reusable component handles the multi-step booking workflow:

1. **Step 1 – Info Note:** "This booking is for media service only. If you want to book only the room, please contact plant service."
2. **Step 2 – Choose Location:** Dropdown from API + shows existing bookings on that location.
3. **Step 3 – Choose Date & Time:** Calendar date picker (min = tomorrow+1 day). Time picker with start/end.
4. **Step 4 – Booking Details:** Event name text field, Equipment request text field (placeholder: "e.g. 4 wireless mics"), Checkboxes: AC, Spotlight (follow light), LED Light + note about Celine light.

**Key implementation details:**

```tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, MapPin, Clock, Calendar as CalendarIcon, FileText } from "lucide-react"
import { mediaBookingAPI, type MediaBooking } from "@/lib/api"

interface BookingFormProps {
  onSuccess: (booking: MediaBooking) => void;
  onCancel: () => void;
  editingBooking?: MediaBooking | null;
}

export function BookingForm({ onSuccess, onCancel, editingBooking }: BookingFormProps) {
  const [step, setStep] = useState(editingBooking ? 2 : 1) // Skip note if editing
  const [locations, setLocations] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState(editingBooking?.location ?? "")
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    editingBooking ? new Date(editingBooking.start_datetime) : null
  )
  const [startTime, setStartTime] = useState(
    editingBooking ? editingBooking.start_datetime.slice(11, 16) : ""
  )
  const [endTime, setEndTime] = useState(
    editingBooking ? editingBooking.end_datetime.slice(11, 16) : ""
  )
  const [existingBookings, setExistingBookings] = useState<MediaBooking[]>([])
  const [eventName, setEventName] = useState(editingBooking?.event_name ?? "")
  const [equipmentRequest, setEquipmentRequest] = useState(editingBooking?.equipment_request ?? "")
  const [acRequired, setAcRequired] = useState(editingBooking?.ac_required ?? false)
  const [spotlightRequired, setSpotlightRequired] = useState(editingBooking?.spotlight_required ?? false)
  const [ledLightRequired, setLedLightRequired] = useState(editingBooking?.led_light_required ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Minimum date: day after tomorrow (bookings must be 1+ day in advance)
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 2)

  useEffect(() => {
    mediaBookingAPI.getLocations().then(r => setLocations(r.locations))
  }, [])

  // Load existing bookings when location + date are selected
  useEffect(() => {
    if (selectedLocation && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      mediaBookingAPI.checkAvailability(selectedLocation, dateStr)
        .then(r => setExistingBookings(r.bookings.filter(b => b.id !== editingBooking?.id)))
        .catch(() => setExistingBookings([]))
    }
  }, [selectedLocation, selectedDate])

  const handleSubmit = async () => {
    if (!selectedLocation || !selectedDate || !startTime || !endTime || !eventName) {
      setError("Please fill in all required fields.")
      return
    }

    const dateStr = selectedDate.toISOString().split('T')[0]
    const data = {
      event_name: eventName,
      location: selectedLocation,
      start_datetime: `${dateStr}T${startTime}:00`,
      end_datetime: `${dateStr}T${endTime}:00`,
      equipment_request: equipmentRequest || undefined,
      ac_required: acRequired,
      spotlight_required: spotlightRequired,
      led_light_required: ledLightRequired,
    }

    setLoading(true)
    setError(null)
    try {
      let result
      if (editingBooking) {
        result = await mediaBookingAPI.updateBooking(editingBooking.id, data)
      } else {
        result = await mediaBookingAPI.createBooking(data)
      }
      onSuccess(result.booking)
    } catch (err: any) {
      setError(err.message || "Failed to submit booking.")
    } finally {
      setLoading(false)
    }
  }

  // Render steps...
  // Step 1: Info note
  // Step 2: Location picker
  // Step 3: Date/time picker with existing bookings shown
  // Step 4: Event details form
}
```

> Full implementation of JSX for each step should follow the existing design style (glassmorphism cards, muted backgrounds, primary colors, dark mode support).

### Step 4.2 — Create `BookingCard` component

**File to create:** `frontend/components/BookingCard.tsx`

A reusable card showing booking summary with status badge and action buttons (Edit / Cancel). Used in both customer and coordinator views.

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Edit, X, User } from "lucide-react"
import { type MediaBooking } from "@/lib/api"

interface BookingCardProps {
  booking: MediaBooking;
  onEdit?: (booking: MediaBooking) => void;
  onCancel?: (booking: MediaBooking) => void;
  onContactCustomer?: (booking: MediaBooking) => void;
  showCustomer?: boolean;   // for coordinator view
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  to_assign:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending:    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  complete:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  canceled:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels: Record<string, string> = {
  to_assign: 'To Assign',
  pending:   'Pending',
  confirmed: 'Confirmed',
  complete:  'Complete',
  canceled:  'Canceled',
}

export function BookingCard({ booking, onEdit, onCancel, onContactCustomer, showCustomer, showActions = true }: BookingCardProps) {
  const canEdit = ['to_assign', 'pending'].includes(booking.status)
  const canCancel = !['canceled', 'complete'].includes(booking.status)

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4 hover:bg-muted/70 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground truncate">{booking.event_name}</h4>
          <Badge className={`text-xs px-2 py-0.5 border-none ${statusColors[booking.status]}`}>
            {statusLabels[booking.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {booking.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(booking.start_datetime).toLocaleDateString()} &nbsp;
            {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(booking.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {showCustomer && booking.customer && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <User className="w-3 h-3" /> {booking.customer.name}
          </p>
        )}
      </div>

      {showActions && (
        <div className="flex items-center gap-2">
          {onContactCustomer && booking.status === 'to_assign' && (
            <Button variant="outline" size="sm" onClick={() => onContactCustomer(booking)}>
              <User className="w-4 h-4 mr-1" /> Contact Customer
            </Button>
          )}
          {onEdit && canEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(booking)}
              className="h-8 w-8 text-muted-foreground hover:text-primary">
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onCancel && canCancel && (
            <Button variant="ghost" size="icon" onClick={() => onCancel(booking)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

### Step 4.3 — Create `CustomerContactModal` component

**File to create:** `frontend/components/CustomerContactModal.tsx`

Modal shown when coordinator clicks "Contact Customer" on a `to_assign` booking.

```tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail, Phone, User } from "lucide-react"
import { mediaBookingAPI, type MediaBooking } from "@/lib/api"

interface CustomerContactModalProps {
  booking: MediaBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerContactModal({ booking, isOpen, onClose }: CustomerContactModalProps) {
  const [customer, setCustomer] = useState<{ id: string; name: string; email: string; phone: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && booking) {
      setLoading(true)
      mediaBookingAPI.getCustomerInfo(booking.id)
        .then(r => setCustomer(r.customer))
        .catch(() => setCustomer(null))
        .finally(() => setLoading(false))
    }
  }, [isOpen, booking])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : customer ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{customer.name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <Mail className="w-4 h-4" />
                {customer.email}
              </a>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </a>
              )}
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                <strong>Booking:</strong> {booking?.event_name}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Location:</strong> {booking?.location}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-destructive">Failed to load customer info.</div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 4.4 — Create `CancelBookingDialog` component

**File to create:** `frontend/components/CancelBookingDialog.tsx`

Reusable dialog asking for a cancellation reason.

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"

interface CancelBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  title?: string;
}

export function CancelBookingDialog({ isOpen, onClose, onConfirm, loading, title = "Cancel Booking" }: CancelBookingDialogProps) {
  const [reason, setReason] = useState("")

  const handleConfirm = () => {
    if (reason.trim()) onConfirm(reason.trim())
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please provide a reason for cancellation. This will be sent to the customer and coordination team.
          </p>
          <div>
            <Label htmlFor="cancel-reason">Reason *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter cancellation reason..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Keep Booking
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim() || loading}>
            {loading ? "Canceling..." : "Confirm Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 4.5 — Create `CustomerSidebar` component

**File to create:** `frontend/components/CustomerSidebar.tsx`

Based on the existing `CoordinatorSidebar.tsx` / `StudentSidebar.tsx` pattern. Only two navigation items:

- 📅 **Book Media Service** (tab: `book`)
- 📋 **My Bookings** (tab: `my-bookings`)

Follow the exact same structure (sidebar with logo, nav items, dark mode toggle, user avatar, logout) as `CoordinatorSidebar.tsx` but with these two menu items only.

---

## Phase 5: Frontend — New Pages

### Step 5.1 — Create Customer Dashboard Page

**File to create:** `frontend/app/dashboard/customer/page.tsx`

Structure:

```tsx
"use client"

// Tabs: 'book' | 'my-bookings'
// Uses: CustomerSidebar, BookingForm, BookingCard, CancelBookingDialog, CustomerContactModal
// Protect with RoleProtectedRoute for 'customer' role

function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings'>('my-bookings')
  const [bookings, setBookings] = useState<MediaBooking[]>([])
  const [editingBooking, setEditingBooking] = useState<MediaBooking | null>(null)
  const [cancelingBooking, setCancelingBooking] = useState<MediaBooking | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false)
  // ... loading, error states

  // On tab 'my-bookings', fetch mediaBookingAPI.getBookings()
  // On cancel: show CancelBookingDialog, then call mediaBookingAPI.cancelBooking()
  // On edit: open BookingForm with editingBooking prop (show confirmation first)
  // After booking submit: show success toast, switch to 'my-bookings' tab
}
```

**Key UX behaviors:**
- "Book Media Service" tab directly shows `BookingForm` as a full-page form (not modal)
- "My Bookings" tab shows list of `BookingCard` components with filter buttons (All / Active / Canceled)
- Edit click → show ConfirmationDialog "Are you sure you want to edit this booking?" → then open form
- Cancel click → open `CancelBookingDialog` with reason field
- After any change → show status dialog (success/error)

### Step 5.2 — Update Coordinator Dashboard for new statuses

**File to modify:** `frontend/app/dashboard/coordinator/page.tsx`

#### Changes needed:

1. **Add `to_assign` and `canceled` to the assignment filter buttons:**

```tsx
// Current filter type:
type AssignmentFilter = 'all' | 'pending' | 'confirmed' | 'complete'
// New filter type:
type AssignmentFilter = 'all' | 'to_assign' | 'pending' | 'confirmed' | 'complete' | 'canceled'
```

Add two new filter buttons in the filter row:
- "To Assign" (amber/yellow color)
- "Canceled" (red/destructive color)

2. **In the assignment list rendering, for `to_assign` items, show additional buttons:**

```tsx
{assignment.status === 'to_assign' && (
  <>
    <Button variant="outline" size="sm" onClick={() => handleContactCustomer(assignment)}>
      <User className="w-4 h-4 mr-1" /> Contact Customer
    </Button>
    <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(assignment)}>
      Cancel Booking
    </Button>
  </>
)}
```

3. **Add "Contact Customer" modal state:**

```tsx
const [contactCustomerBooking, setContactCustomerBooking] = useState<MediaBooking | null>(null)
const [isContactModalOpen, setIsContactModalOpen] = useState(false)
```

4. **Handle coordinator cancel:** When coordinator clicks "Cancel Booking" on a `to_assign` assignment, open `CancelBookingDialog`, then call `mediaBookingAPI.cancelBooking()` using the linked booking ID. The assignment status changes to `canceled` automatically via the backend.

5. **Update the status badge colors** to include the new statuses (match what's in `BookingCard`).

6. **Update `assignmentFilter` state and fetch** to pass the filter to the API call.

### Step 5.3 — Update Supervisor Dashboard

**File to modify:** `frontend/app/dashboard/supervisor/page.tsx`

The supervisor view is read-only. Add `to_assign` and `canceled` to any status filter options so supervisors can see all booking states.

---

## Phase 6: Frontend — Registration & Auth Updates

### Step 6.1 — Update the `AddUserModal` to include `customer` role option

**File to modify:** `frontend/components/AddUserModal.tsx`

In the role dropdown options, add:

```tsx
<option value="customer">Customer</option>
```

### Step 6.2 — Update `RoleProtectedRoute` component

**File to modify:** `frontend/components/RoleProtectedRoute.tsx`

Ensure `customer` is a valid role that gets its own redirect path. Verify the component handles `customer` properly — users with the `customer` role attempting to access `/dashboard/coordinator` or `/dashboard/student` should be redirected to `/dashboard/customer`.

### Step 6.3 — Update root page (redirect logic)

**File to modify:** `frontend/app/page.tsx`

Ensure the role-based redirect handles `customer`:

```tsx
if (user.role === 'customer' || user.roles?.includes('customer')) {
  router.push('/dashboard/customer')
}
```

---

## Phase 7: Backend — Seeder & Role Permission Updates

### Step 7.1 — Run migrations and seeders

```bash
# In the backend container or local backend directory
php artisan migrate
php artisan db:seed --class=RoleAndPermissionSeeder
```

### Step 7.2 — Verify permissions

In the `AuthController` or wherever roles are checked on login, ensure `customer` is returned correctly in the user response:

**File to check:** `backend/app/Http/Controllers/Api/AuthController.php`  
**File to check:** `backend/app/Http/Resources/UserResource.php`

The `role` field returned in the API response should include `customer` as a valid value.

---

## Phase 8: Testing Checklist

### Backend Tests
- [ ] `POST /api/media-bookings` — creates booking + assignment with `to_assign` status
- [ ] `POST /api/media-bookings` with same location + time → returns 422 conflict error
- [ ] `POST /api/media-bookings` with same time, different location → succeeds
- [ ] `POST /api/media-bookings` with booking less than 1 day ahead → returns 422
- [ ] Customer receives email + in-app notification on booking created
- [ ] All coordinators + supervisors receive email + in-app notification on booking created
- [ ] `PUT /api/media-bookings/{id}` — updates booking + assignment + notifies staff
- [ ] `POST /api/media-bookings/{id}/cancel` (customer) — cancels, updates assignment, notifies customer + staff
- [ ] `POST /api/media-bookings/{id}/cancel` (coordinator) — cancels, notifies customer + staff
- [ ] `GET /api/media-bookings/{id}/customer-info` — only accessible by coordinator/supervisor/admin

### Frontend Tests
- [ ] Customer can log in and is redirected to `/dashboard/customer`
- [ ] Booking form shows the note on Step 1
- [ ] Location picker loads from API
- [ ] Date picker disallows today and tomorrow (min = day after tomorrow)
- [ ] Existing bookings at same location + date are displayed
- [ ] Conflicting time slot shows error
- [ ] All form fields submit correctly
- [ ] Success message shown after booking
- [ ] "My Bookings" tab shows customer's bookings with correct status
- [ ] Edit button opens pre-filled form with confirmation dialog
- [ ] Cancel button opens `CancelBookingDialog` with reason field
- [ ] Coordinator sees "To Assign" filter tab with `to_assign` assignments
- [ ] Coordinator sees "Canceled" filter tab
- [ ] "Contact Customer" button in `to_assign` items shows customer modal
- [ ] Coordinator "Cancel Booking" → cancels and moves to Canceled tab
- [ ] Assigning user to `to_assign` assignment → changes status to `pending`

---

## Phase 9: File Summary — All Files to Create or Modify

### Files to **CREATE** (New):
| File | Purpose |
|---|---|
| `backend/database/migrations/2026_07_11_000001_create_media_bookings_table.php` | New table |
| `backend/database/migrations/2026_07_11_000002_add_to_assign_canceled_to_assignments_table.php` | Enum update |
| `backend/database/migrations/2026_07_11_000003_add_customer_to_users_role_enum.php` | Customer role |
| `backend/app/Models/MediaBooking.php` | Booking model |
| `backend/app/Http/Requests/MediaBooking/StoreMediaBookingRequest.php` | Validation |
| `backend/app/Http/Requests/MediaBooking/UpdateMediaBookingRequest.php` | Validation |
| `backend/app/Notifications/BookingCreatedCustomerNotification.php` | Notification |
| `backend/app/Notifications/BookingCreatedStaffNotification.php` | Notification |
| `backend/app/Notifications/BookingUpdatedNotification.php` | Notification |
| `backend/app/Http/Controllers/Api/MediaBookingController.php` | API Controller |
| `frontend/components/BookingForm.tsx` | Multi-step booking form |
| `frontend/components/BookingCard.tsx` | Booking summary card |
| `frontend/components/CustomerContactModal.tsx` | Contact info modal |
| `frontend/components/CancelBookingDialog.tsx` | Cancel with reason dialog |
| `frontend/components/CustomerSidebar.tsx` | Customer navigation |
| `frontend/app/dashboard/customer/page.tsx` | Customer dashboard |

### Files to **MODIFY** (Existing):
| File | Change |
|---|---|
| `backend/app/Models/User.php` | Add `mediaBookings()` and `isCustomer()` |
| `backend/app/Models/Assignment.php` | Add `mediaBooking()` reverse relation |
| `backend/app/Http/Controllers/Api/AssignmentController.php` | Handle `to_assign`/`canceled` statuses |
| `backend/routes/api.php` | Register media booking routes |
| `backend/database/seeders/RoleAndPermissionSeeder.php` | Add `customer` role |
| `frontend/lib/api.ts` | Add `MediaBooking` type + `mediaBookingAPI` + `customer` to role union |
| `frontend/lib/role-routing.ts` | Add `customer` → `/dashboard/customer` routing |
| `frontend/app/dashboard/coordinator/page.tsx` | Add `to_assign`/`canceled` filters + contact/cancel buttons |
| `frontend/app/dashboard/supervisor/page.tsx` | Add new status filters (read-only) |
| `frontend/components/AddUserModal.tsx` | Add `customer` option to role dropdown |
| `frontend/components/RoleProtectedRoute.tsx` | Handle `customer` role protection |
| `frontend/app/page.tsx` | Add `customer` redirect logic |

---

## Developer Notes & Design Guidelines

### Consistency Rules
- **Reuse components:** `BookingCard` should be used in both customer and coordinator views
- **No hardcoded colors:** Use Tailwind classes matching existing patterns (`bg-primary`, `text-muted-foreground`, etc.)
- **Dark mode:** All new components must use `dark:` variants consistently
- **Responsive:** Every new UI must work on mobile (`flex-col md:flex-row`, `w-full md:w-auto`)
- **Confirmation dialogs:** Use existing `ConfirmationDialog` component for all destructive actions; create `CancelBookingDialog` for cancel-with-reason
- **Status colors:** Keep the color scheme consistent:
  - `to_assign` → yellow/amber
  - `pending` → orange
  - `confirmed` → blue
  - `complete` → green
  - `canceled` → red

### Notification Pattern
All notifications follow the existing pattern in `AssignmentAssignedNotification.php`:
- Channels: `['database', 'mail', WebPushChannel::class]`
- `toArray()` → for in-app notification storage
- `toMail()` → for email
- `toWebPush()` → for push notification

### Booking Conflict Logic
- Same location + overlapping time → **BLOCKED**
- Same time + different location → **ALLOWED**
- The `MediaBooking::hasConflict()` static method on the model handles this check

### Assignment Lifecycle with Booking
```
Customer Books → Assignment created (status: to_assign)
Coordinator Assigns → Assignment (status: pending) → existing workflow
Customer/Coordinator Cancels → Assignment (status: canceled)
```
