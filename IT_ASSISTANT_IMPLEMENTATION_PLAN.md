# IT Assistant Feature — Implementation Plan

> **Date:** 2026-08-17  
> **Project:** AV Scheduler (`p-e-koko/av-scheduler`)  
> **Status:** Awaiting Approval

---

## Table of Contents

1. [Overview](#overview)
2. [Access Rules Summary](#access-rules-summary)
3. [User-Facing Flows](#user-facing-flows)
4. [Architecture Diagram](#architecture-diagram)
5. [Backend Changes](#backend-changes)
   - [Migrations](#migrations)
   - [Models](#models)
   - [Controllers](#controllers)
   - [Routes](#routes)
6. [Frontend Changes](#frontend-changes)
   - [API Layer](#api-layer)
   - [Color Palette Utility](#color-palette-utility)
   - [Student Profile — IT Checkbox](#student-profile--it-checkbox)
   - [Student Sidebar](#student-sidebar)
   - [Student Dashboard — IT Office Schedule Tab](#student-dashboard--it-office-schedule-tab)
   - [Supervisor Sidebar](#supervisor-sidebar)
   - [Supervisor Dashboard — New Tabs](#supervisor-dashboard--new-tabs)
   - [IT Office Schedule Page (Supervisor)](#it-office-schedule-page-supervisor)
   - [IT Office Assistants Page (Supervisor)](#it-office-assistants-page-supervisor)
   - [IT Office Schedule View (IT Assistant)](#it-office-schedule-view-it-assistant)
7. [File Change Summary](#file-change-summary)
8. [Open Questions](#open-questions)
9. [Verification Plan](#verification-plan)

---

## Overview

This feature introduces the **IT Assistant** sub-role for student users. IT Assistants are students who work at the IT Office. A supervisor manages their weekly work schedule via a dedicated drag-and-drop grid page. IT Assistants can view their assigned slots and export them to calendar apps.

Two configuration modes exist:
- **IT Assistant Only** — restricted access, only IT-related pages visible
- **IT Assistant + Regular Student** — all regular student pages remain, plus IT Office Schedule added

---

## Access Rules Summary

| Menu Item | Regular Student | IT Assistant (Only) | IT Assistant (+ Regular) | Supervisor |
|---|:---:|:---:|:---:|:---:|
| Profile | ✅ | ✅ | ✅ | — |
| Assignments | ✅ | ❌ | ✅ | — |
| My Schedule | ✅ | ✅ | ✅ | — |
| Inventory | ✅ | ❌ | ✅ | — |
| Keys | ✅ | ❌ | ✅ | — |
| **IT Office Schedule** | ❌ | ✅ (read-only) | ✅ (read-only) | ✅ (full CRUD) |
| **IT Office Assistants** | ❌ | ❌ | ❌ | ✅ |

---

## User-Facing Flows

### Flow 1 — Enabling IT Assistant on a Student Profile

```
Student opens Profile tab
  └─> Sees "IT Assistant" checkbox
        └─> Checks the box
              └─> Confirmation Dialog appears:
                  ┌──────────────────────────────────────┐
                  │  IT Assistant Only?                  │
                  │                                      │
                  │  "Yes" → Restricted access mode      │
                  │  "No"  → Full student + IT access    │
                  └──────────────────────────────────────┘
                        │                    │
                       Yes                  No
                        │                    │
                  is_IT = true         is_IT = true
                  is_it_only = true    is_it_only = false
```

### Flow 2 — Supervisor Views IT Office Assistants Availability

```
Supervisor opens "IT Office Assistants" tab
  └─> PART 1: Sees a list of all IT Assistants with color-coded badges
        └─> Checks one or multiple assistants to filter the grid below
  └─> PART 2: Sees a 6×12 read-only availability grid (Sun–Fri, 8am–7pm)
        └─> Grid source: each assistant's "My Schedule" availability data
        └─> Logic: for each hour slot, show assistant's color badge
             IF that hour is NOT blocked by 'class' or 'unavailable'
             (i.e. they have no class/unavailable entry overlapping 8am–7pm)
        └─> Multiple selected assistants can stack inside one cell
        └─> Deselect an assistant → their badges disappear from the grid
```

### Flow 3 — Supervisor Creates IT Office Schedule

```
Supervisor opens "IT Office Schedule" tab
  └─> Sees 7×12 grid (Sun–Fri, 8am–7pm)
  └─> Sees IT Assistant roster with color-coded names (top panel)
        └─> Option A: Click a time slot cell
              └─> Dropdown shows available IT Assistants (free at that time)
                    └─> Search, then select → schedule entry created
        └─> Option B: Drag a student from roster → drop on a cell
              - If student has class/unavailable → red highlight, drop rejected
              - If student is free → green highlight, drop accepted → entry saved
```

### Flow 4 — IT Assistant Views Their Schedule

```
IT Assistant opens "IT Office Schedule" tab
  └─> Sees personal 7×12 grid with only their assigned slots
        └─> Clicks an assigned slot
              └─> Modal appears with:
                  • "Add to Google Calendar"
                  • "Add to Microsoft Outlook Calendar"
```

---

## Architecture Diagram

```
Student User
  │
  ├── is_IT = false  →  Regular Student (unchanged)
  │
  └── is_IT = true
        ├── is_it_only = true   →  IT-Only Student Sidebar
        └── is_it_only = false  →  Full Student + IT Sidebar

Supervisor
  └── Sees additional sidebar items:
        ├── IT Office Schedule  (CRUD + Drag & Drop Grid)
        └── IT Office Assistants  (Availability overview)

IT Office Schedule Page (Supervisor)
  ├── Reads: availability table → determines who is free per slot
  └── Writes: it_office_schedules table

IT Office Schedule View (IT Assistant)
  └── Reads: it_office_schedules table (own rows only)
        └── Export to Google Calendar / Microsoft Outlook
```

---

## Reusable Existing Components

> **Rule:** Do NOT rebuild what already exists. Every new component must import from the list below before writing any custom UI.

### Existing Custom Components

| Component | File | Use in IT Feature |
|-----------|------|-------------------|
| `ConfirmationDialog` | [`ConfirmationDialog.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/ConfirmationDialog.tsx) | IT Assistant checkbox confirmation (Yes/No/Cancel), delete schedule slot confirmation |
| `StatusDialog` | [`StatusDialog.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/StatusDialog.tsx) | Show success/error after saving a schedule slot or calendar export |
| `LoadingDialog` | [`LoadingDialog.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/LoadingDialog.tsx) | Show spinner while saving/deleting IT Office Schedule entries |
| `NotificationDropdown` | [`NotificationDropdown.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/NotificationDropdown.tsx) | Reuse in both new supervisor tab page headers (same as all other supervisor tabs) |
| `RoleProtectedRoute` | [`RoleProtectedRoute.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/RoleProtectedRoute.tsx) | Wrap both new supervisor tab pages; IT Assistant student dashboard tab |
| `DailyAvailabilityView` | [`DailyAvailabilityView.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/DailyAvailabilityView.tsx) | **Key reference** — reuse its availability-checking logic (`status !== 'class' && status !== 'unavailable'`) and `getAvatarStyle` color pattern for the IT Assistants grid |
| `GoogleCalendarConnect` | [`GoogleCalendarConnect.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/GoogleCalendarConnect.tsx) | Call `connectGoogle()` logic for the Google Calendar export button in IT Assistant schedule slot modal |
| `SupervisorSidebar` | [`SupervisorSidebar.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/SupervisorSidebar.tsx) | Extend with 2 new tab items — do not replace |
| `StudentSidebar` | [`StudentSidebar.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/StudentSidebar.tsx) | Extend with conditional IT tab — do not replace |
| `StudentProfileContent` | [`StudentProfileContent.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/StudentProfileContent.tsx) | Add IT Assistant checkbox inside existing profile card |

### Existing UI Primitives (`/components/ui/`)

| Primitive | File | Use in IT Feature |
|-----------|------|-------------------|
| `Button` | `ui/button.tsx` | All interactive buttons across all new components |
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | `ui/card.tsx` | Page section containers for IT Office Schedule and Assistants pages |
| `Badge` | `ui/badge.tsx` | IT Assistant color-coded name badges in grids and rosters |
| `Avatar`, `AvatarFallback`, `AvatarImage` | `ui/avatar.tsx` | IT Assistant avatars in roster Part 1 |
| `Checkbox` | `ui/checkbox.tsx` | Select/deselect IT assistants in Part 1 roster |
| `Input` | `ui/input.tsx` | Search input inside the click-to-assign popover on the schedule grid |
| `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogFooter` | `ui/dialog.tsx` | Slot detail modal for IT Assistant calendar export; confirmation dialogs |
| `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` | `ui/dropdown-menu.tsx` | Click-to-assign assistant picker popover on schedule grid cells |
| `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` | `ui/table.tsx` | The 6×12 weekly grid — use `<table>` semantic structure |
| `Switch` | `ui/switch.tsx` | Not directly needed, but exists if needed for toggles |

### Key Patterns to Reuse from Existing Code

**Availability checking logic** — from [`DailyAvailabilityView.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/DailyAvailabilityView.tsx#L110-L124):
```typescript
// Already implemented — reuse this exact logic:
const isBlocked = availability.some(a => {
  const studentMatch = a.student_id === student.id
  if (!studentMatch) return false
  if (a.status !== 'class' && a.status !== 'unavailable') return false
  const [startH] = a.start_time.split(':').map(Number)
  const [endH] = a.end_time.split(':').map(Number)
  return hour >= startH && hour < endH
})
```

**Microsoft Calendar export** — from [`dashboard/student/page.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/app/dashboard/student/page.tsx#L511-L551):
```typescript
// Reuse assignmentAPI.addToCalendar() pattern for IT slot export
// Reuse assignmentAPI.getMicrosoftAuthUrl() for Outlook connect flow
```

**Color index assignment** — from [`DailyAvailabilityView.tsx`](file:///c:/Users/Pann/Documents/FinalClone/final-project-p-e-koko/frontend/components/DailyAvailabilityView.tsx#L44-L57):
```typescript
// DailyAvailabilityView already has avatarColors[] + getAvatarStyle(seed)
// The new it-assistant-colors.ts will standardize this into a single source
// of truth used by BOTH DailyAvailabilityView and all new IT components
```

**getInitials helper** — already defined in multiple pages. Copy from existing instead of reinventing:
```typescript
const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
```

**getStoredUser / setStoredUser** — always use from `@/lib/api` to sync user state.

---

## Backend Changes

### Migrations

#### [NEW] `add_is_it_to_users_table.php`

Adds two boolean columns to the `users` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `is_IT` | boolean | `false` | Marks user as an IT Assistant |
| `is_it_only` | boolean | `false` | Restricts to IT-only access if `true` |

```php
Schema::table('users', function (Blueprint $table) {
    $table->boolean('is_IT')->default(false)->after('is_approved');
    $table->boolean('is_it_only')->default(false)->after('is_IT');
});
```

---

#### [NEW] `create_it_office_schedules_table.php`

Creates the `it_office_schedules` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `student_id` | UUID (FK) | References `users.id` |
| `created_by` | UUID (FK) | Supervisor who created the entry |
| `day_of_week` | tinyInteger | 0 = Sunday … 5 = Friday |
| `start_time` | time | e.g. `08:00:00` |
| `end_time` | time | e.g. `09:00:00` |
| `timestamps` | — | `created_at`, `updated_at` |
| `soft_deletes` | — | `deleted_at` |

```php
Schema::create('it_office_schedules', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('student_id');
    $table->uuid('created_by');
    $table->tinyInteger('day_of_week'); // 0=Sun, 1=Mon, ... 5=Fri
    $table->time('start_time');
    $table->time('end_time');
    $table->timestamps();
    $table->softDeletes();

    $table->foreign('student_id')->references('id')->on('users');
    $table->foreign('created_by')->references('id')->on('users');
});
```

---

### Models

#### [MODIFY] `backend/app/Models/User.php`

```php
// Add to $fillable:
'is_IT',
'is_it_only',

// Add to casts():
'is_IT'      => 'boolean',
'is_it_only' => 'boolean',

// Add helper method:
public function isITAssistant(): bool
{
    return (bool) $this->is_IT;
}

public function isITOnly(): bool
{
    return (bool) $this->is_it_only;
}

// Add relationship:
public function itOfficeSchedules()
{
    return $this->hasMany(ITOfficeSchedule::class, 'student_id');
}
```

---

#### [NEW] `backend/app/Models/ITOfficeSchedule.php`

```php
<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ITOfficeSchedule extends Model
{
    use HasUuid, SoftDeletes;

    protected $fillable = [
        'student_id',
        'created_by',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```

---

### Controllers

#### [MODIFY] `backend/app/Http/Controllers/Api/UserController.php`

- Allow `is_IT` and `is_it_only` in update validation
- Return `is_IT` and `is_it_only` in all user API responses
- Add filter: `GET /api/users/it-assistants` → returns all users where `is_IT = true`, including their color index

---

#### [NEW] `backend/app/Http/Controllers/Api/ITOfficeScheduleController.php`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `index` | `GET /it-office-schedules` | Supervisor + IT Assistants | Supervisor gets all; IT assistant gets own |
| `store` | `POST /it-office-schedules` | Supervisor only | Create a new schedule slot |
| `update` | `PUT /it-office-schedules/{id}` | Supervisor only | Update a slot (reassign) |
| `destroy` | `DELETE /it-office-schedules/{id}` | Supervisor only | Delete a slot |
| `availableAssistants` | `GET /it-office-schedules/available-assistants` | Supervisor only | Returns IT assistants free at `?day=X&hour=Y` (cross-references `availability` table) |

**`availableAssistants` Logic:**

```
1. Get all users where is_IT = true
2. For each user, check availability table:
   - If any row exists for that day_of_week AND overlaps the requested hour
     with status IN ('class', 'unavailable') → mark as UNAVAILABLE
3. Return the free ones with their color index
```

---

### Routes

#### [MODIFY] `backend/routes/api.php`

```php
// IT Assistant user list
Route::get('/users/it-assistants', [UserController::class, 'getITAssistants']);

// IT Office Schedule CRUD
Route::get('/it-office-schedules', [ITOfficeScheduleController::class, 'index']);
Route::post('/it-office-schedules', [ITOfficeScheduleController::class, 'store']);
Route::put('/it-office-schedules/{id}', [ITOfficeScheduleController::class, 'update']);
Route::delete('/it-office-schedules/{id}', [ITOfficeScheduleController::class, 'destroy']);
Route::get('/it-office-schedules/available-assistants', [ITOfficeScheduleController::class, 'availableAssistants']);
```

---

## Frontend Changes

### API Layer

#### [MODIFY] `frontend/lib/api.ts`

```typescript
// Add to User interface:
is_IT?: boolean;
is_it_only?: boolean;

// New interface:
export interface ITOfficeSchedule {
  id: string;
  student_id: string;
  created_by: string;
  day_of_week: number; // 0=Sun ... 5=Fri
  start_time: string;
  end_time: string;
  student?: User;
  created_at: string;
  updated_at: string;
}

// New API object:
export const itOfficeScheduleAPI = {
  async getSchedules(): Promise<{ data: ITOfficeSchedule[] }>,
  async createSchedule(data: Partial<ITOfficeSchedule>): Promise<{ data: ITOfficeSchedule }>,
  async updateSchedule(id: string, data: Partial<ITOfficeSchedule>): Promise<{ data: ITOfficeSchedule }>,
  async deleteSchedule(id: string): Promise<{ message: string }>,
  async getAvailableAssistants(day: number, hour: number): Promise<{ data: User[] }>,
  async getITAssistants(): Promise<{ data: User[] }>,
};
```

---

### Color Palette Utility

#### [NEW] `frontend/lib/it-assistant-colors.ts`

```typescript
export const IT_ASSISTANT_COLORS = [
  { bg: '#6366f1', text: '#ffffff', name: 'Indigo'   },
  { bg: '#ec4899', text: '#ffffff', name: 'Pink'     },
  { bg: '#f59e0b', text: '#ffffff', name: 'Amber'    },
  { bg: '#10b981', text: '#ffffff', name: 'Emerald'  },
  { bg: '#3b82f6', text: '#ffffff', name: 'Blue'     },
  { bg: '#ef4444', text: '#ffffff', name: 'Red'      },
  { bg: '#8b5cf6', text: '#ffffff', name: 'Violet'   },
  { bg: '#14b8a6', text: '#ffffff', name: 'Teal'     },
  { bg: '#f97316', text: '#ffffff', name: 'Orange'   },
  { bg: '#64748b', text: '#ffffff', name: 'Slate'    },
];

/**
 * Returns color for an IT assistant by their sorted index.
 * Color is consistent across all pages.
 */
export function getITAssistantColor(index: number) {
  return IT_ASSISTANT_COLORS[index % IT_ASSISTANT_COLORS.length];
}
```

> **Note:** Colors are assigned by the order students appear when sorted by `created_at`. This is consistent across all pages as long as the same sorted list is used.

---

### Student Profile — IT Checkbox

#### [MODIFY] `frontend/components/StudentProfileContent.tsx`

**Reuses:** `ConfirmationDialog`, `StatusDialog`, `LoadingDialog`, `Badge`, `Checkbox` (ui), `Button`, `Dialog`

**Changes:**
- Add an **"IT Assistant" `<Checkbox />`** (from `ui/checkbox.tsx`) inside the existing profile info card
- Checkbox is editable only if viewer is admin/supervisor OR the student themselves
- On check:
  1. Show **`<ConfirmationDialog>`** with:
     - Title: `"IT Assistant Only?"`
     - Description: `"Select 'Yes' if this student should only access IT Office features. Select 'No' to keep all regular student access."`
     - Since `ConfirmationDialog` only supports one confirm action, use **`<Dialog>` + `<DialogContent>`** directly for the 3-button (Yes / No / Cancel) variant
  2. On **Yes** → `PATCH /api/users/{id}` with `{ is_IT: true, is_it_only: true }`
  3. On **No** → `PATCH /api/users/{id}` with `{ is_IT: true, is_it_only: false }`
  4. Show `<LoadingDialog>` while saving; `<StatusDialog>` on success/error
  5. Update local state and `localStorage` user via `setStoredUser()`
- Uncheck → `PATCH /api/users/{id}` with `{ is_IT: false, is_it_only: false }` + same loading/status dialogs
- **Profile card `<Badge>`** shows `"IT Assistant"` label when `is_IT = true`

---

### Student Sidebar

#### [MODIFY] `frontend/components/StudentSidebar.tsx`

```typescript
// Updated activeTab type:
type StudentTab = "profile" | "assignments" | "schedule" | "it-office-schedule"

// Nav rendering logic:
const isITOnly = currentUser?.is_it_only === true
const isIT     = currentUser?.is_IT === true

// Always show:
- Profile
- My Schedule (available to all)

// Show only if NOT IT-only:
- Assignments    (hidden if isITOnly)
- Inventory      (hidden if isITOnly)
- Keys           (hidden if isITOnly)

// Show only if IT Assistant:
- IT Office Schedule  (shown if isIT)
```

---

### Student Dashboard — IT Office Schedule Tab

#### [MODIFY] `frontend/app/dashboard/student/page.tsx`

**Reuses:** `StudentSidebar`, `RoleProtectedRoute`, `NotificationDropdown`, `LoadingDialog`, `StatusDialog`

- Add `"it-office-schedule"` to the valid tab values
- When `activeTab === "it-office-schedule"`:
  - Render `<ITOfficeScheduleAssistantView />`
- Header title: `"IT Office Schedule"`
- Header subtitle: `"Your assigned IT Office working hours"`

---

### Supervisor Sidebar

#### [MODIFY] `frontend/components/SupervisorSidebar.tsx`

```typescript
// Updated activeTab type:
type SupervisorTab =
  | "dashboard"
  | "student-schedules"
  | "assignment-schedules"
  | "students"
  | "it-office-schedule"      // NEW
  | "it-office-assistants"    // NEW

// New nav items (added below existing ones):
- Icon: Monitor  | Label: "IT Office Schedule"
- Icon: UserCheck | Label: "IT Office Assistants"
```

---

### Supervisor Dashboard — New Tabs

#### [MODIFY] `frontend/app/dashboard/supervisor/page.tsx`

**Reuses:** `SupervisorSidebar`, `RoleProtectedRoute`, `NotificationDropdown`

- Add `"it-office-schedule"` and `"it-office-assistants"` to valid tab values
- Render `<ITOfficeSchedulePage />` when `activeTab === "it-office-schedule"`
- Render `<ITOfficeAssistantsPage />` when `activeTab === "it-office-assistants"`
- Add header title/subtitle strings for both tabs

---

### IT Office Schedule Page (Supervisor)

#### [NEW] `frontend/components/ITOfficeSchedulePage.tsx`

**Reuses:**
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — page section wrappers
- `Badge` — color-coded IT assistant name chips in the roster (Part 1)
- `Avatar`, `AvatarFallback`, `AvatarImage` — assistant avatars in roster
- `Input` — search box inside the click-to-assign popover
- `Button` — all interactive buttons
- `DropdownMenu` / `DropdownMenuContent` / `DropdownMenuTrigger` — click-to-assign popover on grid cells
- `ConfirmationDialog` — confirm before deleting an assigned slot
- `StatusDialog` — show success/error after assign/delete operations
- `LoadingDialog` — spinner while saving or deleting
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` — the 6×12 weekly grid structure
- Availability checking logic from `DailyAvailabilityView` — reuse verbatim
- `getInitials()` helper — copy from existing pages
- `getStoredUser()` — from `@/lib/api`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  IT OFFICE SCHEDULE                                         │
├─────────────────────────────────────────────────────────────┤
│  [PART 1 — IT ASSISTANT ROSTER]                            │
│  ● John Doe (Indigo)  ● Jane Smith (Pink)  ● ...           │
│  (Multi-select: highlight on grid)                         │
├─────────────────────────────────────────────────────────────┤
│  [PART 2 — SCHEDULE GRID]                                  │
│                                                             │
│       8am  9am  10am  11am  12pm  1pm  2pm  3pm  4pm  5pm  6pm  7pm │
│  Sun  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
│  Mon  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
│  Tue  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
│  Wed  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
│  Thu  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
│  Fri  [ ]  [ ]  [ ]   [ ]   [ ]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ] │
└─────────────────────────────────────────────────────────────┘
```

**Cell States:**

| State | Visual |
|-------|--------|
| Empty + droppable | Subtle green tint on drag hover |
| Empty + blocked (student has class) | Red/gray tint, drop rejected with shake animation |
| Occupied | Student name badge with their color background |
| Hover on occupied | Shows delete (×) button |

**Interactions:**

1. **Drag from roster → Drop on cell**
   - Uses HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
   - On `dragover`: check if student is free at that `[day, hour]` — color cell accordingly
   - On `drop`: call `POST /api/it-office-schedules`

2. **Click on empty cell**
   - Opens a popover with:
     - Search input (filters IT assistants)
     - List of available assistants (those free at that slot)
     - Click to assign → calls `POST /api/it-office-schedules`

3. **Click × on occupied cell**
   - Confirmation dialog → `DELETE /api/it-office-schedules/{id}`

---

### IT Office Assistants Page (Supervisor)

#### [NEW] `frontend/components/ITOfficeAssistantsPage.tsx`

**Reuses:**
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — page section wrappers
- `Checkbox` (from `ui/checkbox.tsx`) — select/deselect assistants in Part 1
- `Avatar`, `AvatarFallback`, `AvatarImage` — assistant avatars in roster list
- `Badge` — color-coded name labels
- `Button` — Select All / Deselect All
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` — 6×12 availability grid
- `getInitials()` — reuse helper
- Availability checking logic — **reuse exactly** from `DailyAvailabilityView.tsx` (already filters `class`/`unavailable`)
- `getStoredUser()` from `@/lib/api`

This is a **read-only reference page** for the supervisor. Its purpose is to show when each IT Assistant is **naturally available** (i.e. has no class or unavailable block) during office hours (8am–7pm). This data comes purely from each student's **My Schedule** — it does not read or write the `it_office_schedules` table.

---

**Data Source — Availability Logic:**

For each IT Assistant and each 1-hour time slot between 8am and 7pm:

```
For each assistant (selected by supervisor):
  For each day (Sun → Fri):
    For each hour (8am, 9am, ..., 6pm → 7pm):

      Check availability table WHERE:
        student_id = assistant.id
        AND date day_of_week matches
        AND (start_time < hour+1 AND end_time > hour)
        AND status IN ('class', 'unavailable')

      IF no blocking record found:
        → assistant is AVAILABLE at this slot  ✅
      ELSE:
        → assistant is BLOCKED at this slot   ❌
```

> **Important:** A slot is considered **available** only if there is NO `class` or `unavailable` entry in the student's My Schedule overlapping that hour. Slots with no entry at all are treated as available (free).

---

**Page Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  IT OFFICE ASSISTANTS                              [Read-Only]   │
├──────────────────────────────────────────────────────────────────┤
│  PART 1 — SELECT ASSISTANTS                                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ☑  ██ John Doe        (Indigo)                          │   │
│  │  ☑  ██ Jane Smith      (Pink)                            │   │
│  │  ☑  ██ Bob Lee         (Amber)                           │   │
│  │  ☐  ██ Alice Nguyen    (Emerald)   ← deselected          │   │
│  │  ☑  ██ Mark Chen       (Blue)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Select All]  [Deselect All]                                    │
├──────────────────────────────────────────────────────────────────┤
│  PART 2 — AVAILABILITY GRID (from My Schedule)                   │
│  Showing free time slots between 8am–7pm (no class/unavailable)  │
│                                                                  │
│        8am      9am      10am     11am     12pm     1pm  ...     │
│  Sun  [JD][MC]  [JS]     [ ]      [JD]     [ ]      [BL] ...    │
│  Mon  [ ]       [JD][JS] [MC]     [ ]      [JD][BL] [ ]  ...    │
│  Tue  [JS]      [ ]      [JD][MC] [BL]     [ ]      [JS] ...    │
│  Wed  [BL][MC]  [JD]     [ ]      [JS][MC] [JD]     [ ]  ...    │
│  Thu  [ ]       [BL]     [JS]     [JD][MC] [ ]      [BL] ...    │
│  Fri  [JD]      [JS][BL] [MC]     [ ]      [JD]     [JS] ...    │
│                                                                  │
│  Legend:  ██ JD = John Doe   ██ JS = Jane Smith                 │
│           ██ BL = Bob Lee    ██ MC = Mark Chen                  │
└──────────────────────────────────────────────────────────────────┘
```

---

**Grid Cell Rendering Rules:**

| Condition | Cell Content |
|-----------|-------------|
| 1 assistant available | Single color badge with initials (e.g. `JD`) |
| 2+ assistants available | Multiple stacked color badges |
| No selected assistants available | Empty cell |
| All slots empty (assistant deselected) | Column remains but all cells empty |

---

**Part 1 — Assistant List Behavior:**

- Each row shows: `[checkbox] [color swatch] [Full Name] [(color name)]`
- Checkbox is **checked by default** for all assistants on page load
- Unchecking an assistant **removes their badges from the entire grid** without a page reload (client-side filter)
- `[Select All]` and `[Deselect All]` buttons provided
- Color swatches and initials are consistent with the global `IT_ASSISTANT_COLORS` palette

---

**Part 2 — Grid Behavior:**

- Grid is **read-only** — no click, drag, or edit interactions
- Grid only shows the **intersection of time 8am–7pm** from the student's My Schedule
- The grid header row shows hours: `8am | 9am | 10am | 11am | 12pm | 1pm | 2pm | 3pm | 4pm | 5pm | 6pm | 7pm`
- The day column shows: `Sun | Mon | Tue | Wed | Thu | Fri`
- Hovering a cell shows a tooltip listing all available assistants by full name

---

**API Calls Needed:**

```typescript
// 1. Fetch all IT assistants
GET /api/users/it-assistants
// Returns: User[] where is_IT = true, sorted by created_at

// 2. Fetch all availability for IT assistants (My Schedule data)
GET /api/availability?student_ids[]=id1&student_ids[]=id2&per_page=10000
// Client computes the grid from this data (no class / unavailable = free)
```

> **Performance Note:** Availability data for all IT assistants is fetched once on page load. The select/deselect filtering is done entirely client-side with no additional API calls.

---

### IT Office Schedule View (IT Assistant)

#### [NEW] `frontend/components/ITOfficeScheduleAssistantView.tsx`

**Reuses:**
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — page wrapper
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` — 6×12 read-only grid
- `Badge` — highlight assigned slots with the assistant's own color
- `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogFooter` — slot detail modal with export buttons
- `Button` — Google Calendar and Microsoft Outlook export buttons
- `StatusDialog` — show success/error after calendar export
- `LoadingDialog` — show while exporting to calendar
- `GoogleCalendarConnect` — reuse the `connectGoogle()` and `createGoogleBooking()` pattern for the Google Calendar button
- Microsoft Calendar export — reuse the `assignmentAPI.getMicrosoftAuthUrl()` + `addToCalendar()` pattern already used in `dashboard/student/page.tsx`
- `getStoredUser()` from `@/lib/api`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  MY IT OFFICE SCHEDULE                                      │
├─────────────────────────────────────────────────────────────┤
│       8am  9am  10am  11am  12pm  ...                       │
│  Sun  [ ]  [ ]  [●]   [ ]   [ ]   ...   ← assigned slot    │
│  Mon  [ ]  [●]  [ ]   [ ]   [ ]   ...                      │
│  Tue  [ ]  [ ]  [ ]   [ ]   [ ]   ...                      │
│  Wed  [ ]  [ ]  [ ]   [●]   [ ]   ...                      │
│  Thu  [ ]  [ ]  [ ]   [ ]   [ ]   ...                      │
│  Fri  [●]  [ ]  [ ]   [ ]   [ ]   ...                      │
└─────────────────────────────────────────────────────────────┘
```

**Click on assigned slot → Modal:**

```
┌──────────────────────────────────┐
│  Monday, 9:00 AM – 10:00 AM      │
│  IT Office Duty                  │
│                                  │
│  [📅 Add to Google Calendar]     │
│  [📆 Add to Microsoft Outlook]   │
│                       [Close]    │
└──────────────────────────────────┘
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/database/migrations/…_add_is_it_to_users_table.php` | **NEW** | Add `is_IT`, `is_it_only` columns |
| `backend/database/migrations/…_create_it_office_schedules_table.php` | **NEW** | New IT schedule table |
| `backend/app/Models/User.php` | **MODIFY** | Add fillable, casts, helper methods |
| `backend/app/Models/ITOfficeSchedule.php` | **NEW** | Eloquent model for IT schedules |
| `backend/app/Http/Controllers/Api/UserController.php` | **MODIFY** | Accept `is_IT`, `is_it_only` on update; add `getITAssistants` |
| `backend/app/Http/Controllers/Api/ITOfficeScheduleController.php` | **NEW** | Full CRUD + available-assistants endpoint |
| `backend/routes/api.php` | **MODIFY** | Register IT Office Schedule routes |
| `frontend/lib/api.ts` | **MODIFY** | Add `is_IT`, `is_it_only` to `User`; add `itOfficeScheduleAPI` |
| `frontend/lib/it-assistant-colors.ts` | **NEW** | Consistent color palette utility |
| `frontend/components/StudentSidebar.tsx` | **MODIFY** | Conditional nav based on IT flags |
| `frontend/components/SupervisorSidebar.tsx` | **MODIFY** | Add 2 IT nav items |
| `frontend/components/StudentProfileContent.tsx` | **MODIFY** | IT Assistant checkbox + confirmation dialog |
| `frontend/app/dashboard/student/page.tsx` | **MODIFY** | Handle `it-office-schedule` tab |
| `frontend/app/dashboard/supervisor/page.tsx` | **MODIFY** | Handle `it-office-schedule` and `it-office-assistants` tabs |
| `frontend/components/ITOfficeSchedulePage.tsx` | **NEW** | Supervisor CRUD + drag-drop grid |
| `frontend/components/ITOfficeAssistantsPage.tsx` | **NEW** | Supervisor availability overview |
| `frontend/components/ITOfficeScheduleAssistantView.tsx` | **NEW** | IT Assistant read-only grid + calendar export |

**Total: 8 modified files, 9 new files**

---

## Open Questions

1. **Schedule Recurrence** — Should IT Office Schedule entries repeat every week (stored as `day_of_week`), or are they one-time entries with a specific date?

2. **Color Assignment** — Colors are assigned by student creation order. Should supervisors be able to manually pick a color for each IT assistant?

3. **IT-Only Access** — When `is_it_only = true`, the student cannot be assigned to AV work (Assignments tab hidden). Is this intentional?

4. **Calendar Export Format** — What title/description should the exported calendar event have? e.g., `"IT Office Duty — 9:00 AM to 10:00 AM"`?

5. **Unchecking IT Assistant** — If a student unchecks the "IT Assistant" checkbox later, should their existing IT Office Schedule slots be deleted automatically?

---

## Verification Plan

### Database
```bash
php artisan migrate
php artisan migrate:status
```

### Backend Tests
```bash
php artisan test
```

### Manual Verification Checklist

- [ ] Student logs in → opens Profile → "IT Assistant" checkbox is visible
- [ ] Checking checkbox → confirmation dialog appears with "Yes" / "No" / "Cancel"
- [ ] "Yes" selected → Assignments, Inventory, Keys disappear from sidebar; IT Office Schedule appears
- [ ] "No" selected → all nav items remain + IT Office Schedule added
- [ ] Supervisor logs in → "IT Office Schedule" and "IT Office Assistants" appear in sidebar
- [ ] **IT Office Assistants page** loads with all IT assistants listed in Part 1 with color badges
- [ ] All assistants are checked by default; deselecting one removes their badges from the grid
- [ ] "Select All" / "Deselect All" buttons work correctly
- [ ] Grid cells show color-coded initials for assistants who are FREE at that hour (no class/unavailable)
- [ ] Assistants with a class at that hour do NOT appear in that cell
- [ ] Hovering a grid cell shows a tooltip with all available assistant full names
- [ ] IT Office Schedule grid renders with 6 rows (Sun–Fri) and 12 columns (8am–7pm)
- [ ] Dragging an IT assistant to a free slot → drop accepted, entry saved and visible in grid
- [ ] Dragging an IT assistant to a slot where they have a class → drop rejected with visual feedback
- [ ] Clicking an empty cell → popover shows list of available assistants with search
- [ ] Clicking × on an occupied cell → confirmation dialog → entry deleted
- [ ] IT Assistant logs in → IT Office Schedule tab shows only their own assigned slots
- [ ] Clicking an assigned slot → modal with calendar export buttons appears
- [ ] Colors are consistent: same student shows same color across all pages and both supervisor pages
