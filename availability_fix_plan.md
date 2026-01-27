# Fix Availability 500 Error & Add Recurrence Support

## Problem
- 500 Error when deleting availability.
- Suspected cause: `AuditLogger` failing (possibly due to null user or strict typing) crashing the request.
- Missing `title` and `recurrence_id` persistence in some flows.

## Changes Implemented

### Backend
1.  **Safety Wrapper**: Wrapped `AuditLogger::log` calls in `try-catch` blocks in `AvailabilityController.php` to prevent non-critical logging failures from blocking the main action.
2.  **Resource Update**: Updated `AvailabilityResource` to include `title` and `recurrence_id`.
3.  **Model Update**: Added `title` and `recurrence_id` to `fillable` in `Availability` model.
4.  **Validation**: `StoreAvailabilityRequest` and `UpdateAvailabilityRequest` now validate `title` and `recurrence_id`.

### Frontend
1.  **API Library (`api.ts`)**:
    - Updated `Availability` interface.
    - Updated `deleteAvailability` to support `mode` parameter for recurring events.
    - Fixed API endpoint formatting.
2.  **Edit Modal**:
    - Passes `mode` ('single', 'future', 'all') to delete API.
    - Handles `recurrence_id` logic.
3.  **Add Modal**:
    - Generates `recurrence_id` (UUID) for recurring event groups.
    - Sends `isMyAvailability=true` for proper endpoint usage.

## Verification
1.  **User Action**: Run `sudo docker compose restart backend` to apply PHP changes.
2.  **Test**:
    - Create a recurring availability.
    - Delete "This and following events".
    - Check if successful (no 500 error).
