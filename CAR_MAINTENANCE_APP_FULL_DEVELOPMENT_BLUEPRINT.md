# 🚗 Car Maintenance App - Full Development Blueprint

**Purpose:** Build a personal mobile app to track vehicle maintenance

---

## 0) Project Overview

### Goal
Create a mobile app to manage car maintenance history, reminders, and schedules for one or more vehicles.

### Core User Value
- Know what maintenance was done, when, and at what mileage.
- Never miss due service (time-based or mileage-based).
- Log maintenance quickly with minimal friction.

### Maintenance Action Types
Use this fixed action taxonomy across app + database + validation:
- `oil_change`
- `air_filter_change`
- `cabin_air_filter_change`
- `tire_rotation`
- `wiper_blade`
- `battery`
- `brake`
- `new_tire`
- `other`

---

## 1) Same Tech Stack + Architecture

### Frontend
- Expo (React Native + TypeScript)
- React Navigation (bottom tabs + nested stacks)
- React Hook Form + Zod
- TanStack Query (optional adoption, same pattern)
- Expo Notifications

### Backend
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Firebase Security Rules
- Optional Cloud Functions (later phase)

### Project Architecture (same pattern)
- `src/screens/` UI screens
- `src/services/` Firestore and business logic
- `src/types/` model interfaces and navigation types
- `src/schemas/` Zod validation schemas
- `src/contexts/` auth and app-level state
- `src/components/` reusable UI blocks
- `src/utils/` date/helpers/formatting

### Suggested Navigation
- `HomeTab`
- `VehiclesTab`
- `MaintenanceTab`
- `CalendarTab`
- `ProfileTab`

---

## 2) Phase-by-Phase Development Plan

## Phase 0 — Scope Lock
**Goal:** Freeze MVP features and out-of-scope items.

### MVP In Scope
1. Vehicle CRUD (add/list/detail/edit/archive)
2. Maintenance logging CRUD
3. Reminder system (date + mileage rules)
4. Home dashboard (upcoming/overdue summary)
5. Calendar timeline (maintenance + reminders)

### Out of Scope (MVP)
- OBD live diagnostics integration
- OCR receipt scanning
- Parts marketplace
- Social/community
- Multi-user shared garages

### Exit Criteria
- Signed MVP list with no open scope ambiguity.

---

## Phase 1 — Setup & Foundation
**Goal:** Initialize app + Firebase + base structure.

### Tasks
- Initialize Expo TypeScript app.
- Configure Firebase auth/firestore.
- Create shared folders and baseline components.
- Set up auth flow + bottom tabs shell.
- Add basic CI scripts: `web`, `build:ios:preview`.

### Exit Criteria
- App runs on web + iOS preview build.
- Auth + Firestore connectivity validated.

---

## Phase 2 — Data Models & Validation
**Goal:** Define schema and app types.

### Firestore Collections
1. `users/{userId}`
2. `vehicles/{vehicleId}`
3. `maintenance/{maintenanceId}`
4. `reminders/{reminderId}`

### Recommended Vehicle Model
```ts
interface Vehicle {
  id?: string;
  userId: string;
  name: string;                 // "Civic", "CR-V"
  make?: string;                // Honda
  model?: string;               // Civic
  year?: number;                // 2021
  vin?: string;
  plate?: string;
  currentMileage?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Maintenance Model
```ts
type MaintenanceType =
  | 'oil_change'
  | 'air_filter_change'
  | 'cabin_air_filter_change'
  | 'tire_rotation'
  | 'wiper_blade'
  | 'battery'
  | 'brake'
  | 'new_tire'
  | 'other';

interface MaintenanceRecord {
  id?: string;
  userId: string;
  vehicleId: string;
  type: MaintenanceType;
  date: Date;
  mileage?: number;
  notes?: string;
  cost?: number;
  createdAt: Date;
}
```

### Reminder Model (supports date + mileage)
```ts
interface Reminder {
  id?: string;
  userId: string;
  vehicleId: string;
  type: MaintenanceType;
  dueDate?: Date;
  dueMileage?: number;
  isCompleted: boolean;
  notificationSent: boolean;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Validation
- Zod schema for each model.
- Strict enum for maintenance types.
- Safe coercion for `date`, `mileage`, `cost`.

### Exit Criteria
- Types + schemas compiled and used in services.

---

## Phase 3 — Core Vehicle + Maintenance Flows
**Goal:** Deliver primary CRUD workflows.

### Vehicle Screens
- `VehicleListScreen`
- `VehicleDetailScreen`
- `AddVehicleScreen`
- `EditVehicleScreen`

### Maintenance Screens
- `MaintenanceListScreen`
- `AddMaintenanceScreen`
- `MaintenanceDetailScreen`
- `EditMaintenanceScreen`

### Behavior Requirements
- Add maintenance updates vehicle `currentMileage` if higher.
- Archive vehicle hides from active lists but keeps history.
- Type filters in maintenance list.

### Exit Criteria
- User can fully manage vehicles and maintenance records.

---

## Phase 4 — Reminder Engine + Home Dashboard
**Goal:** Build actionable reminders and dashboard summary.

### Reminder Logic
- Date-based due reminders.
- Mileage-based due reminders.
- Overdue detection.
- Visibility policy (optional): show pending reminders from day-before due date.

### Home Dashboard
- Total active vehicles
- Maintenance due soon
- Overdue reminders
- Quick actions:
  - Log maintenance
  - Mark reminder done
  - Snooze reminder (+1 day)

### Automation
- Logging maintenance auto-completes matching pending reminders.
- Completing reminder can auto-log maintenance (optional toggle by product decision).

### Exit Criteria
- End-to-end reminder lifecycle works reliably.

---

## Phase 5 — Calendar & Timeline
**Goal:** Consolidate maintenance/reminders into calendar.

### Calendar Features
- Month view markers:
  - Maintenance performed
  - Reminder due
  - Overdue reminder
- Day timeline list with filters:
  - All / Maintenance / Reminders
- Reminder actions directly in timeline.

### Exit Criteria
- Calendar is one-tap accessible and actionable.

---

## Phase 6 — Security Hardening
**Goal:** Enforce strict owner-only access and verify via tests.

### Firestore Rules
- User can only read/write own `vehicles`, `maintenance`, `reminders`, `users` doc.
- No cross-user document access.

### Test Plan
- Firestore emulator test suite:
  - owner read/write success
  - non-owner read/write failure
  - malformed payload rejection (where applicable)

### Exit Criteria
- Rules deployed and emulator tests passing.

---

## Phase 7 — Polish & Release Prep
**Goal:** Improve UX quality and ship-ready behavior.

### Must Have
- Consistent loading/empty/error states.
- Accessibility pass on key actions.
- Final smoke checklist (web + iOS test device).

### Should Have
- Better list performance.
- Minor visual consistency pass.

### Exit Criteria
- Stable preview build with no blocker issues.

---

## 3) Detailed Service Layer Plan

Create these service files:
- `vehicleService.ts`
- `maintenanceService.ts`
- `reminderService.ts`
- `calendarService.ts`

Each service should include:
- Create/get/list/update/delete helpers
- Input validation via Zod
- Firestore timestamp normalization
- Error-safe wrappers with user-friendly messages

---

## 4) Suggested Folder Structure

```text
src/
  components/
  contexts/
  schemas/
  screens/
    auth/
    main/
    vehicles/
    maintenance/
    reminders/
    calendar/
    profile/
  services/
  types/
  utils/
```

---

## 5) MVP Acceptance Checklist

- [ ] User can authenticate and stay signed in.
- [ ] User can add/edit/archive vehicles.
- [ ] User can log each maintenance action type.
- [ ] Reminders trigger and can be completed/snoozed.
- [ ] Calendar displays combined maintenance + reminder data.
- [ ] Security rules prevent cross-user data access.
- [ ] iOS preview build installs and passes smoke test.

---

## 6) Example Milestone Sequence (Practical)

1. Foundation commit (Phase 1)
2. Models + schemas commit (Phase 2)
3. Vehicle flows commit (Phase 3A)
4. Maintenance flows commit (Phase 3B)
5. Reminder engine commit (Phase 4)
6. Calendar commit (Phase 5)
7. Security rules + tests commit (Phase 6)
8. Release polish commit (Phase 7)

---

## 7) Future Extensions (Post-MVP)

- Service interval templates by car make/model
- Receipt uploads and service history attachments
- Tire set tracking (summer/winter)
- Fuel economy trends
- Push notifications with server-side scheduling
- AI quick logging from plain language

---

## 8) Build & Run Commands (same pattern)

```bash
npm install
npm run web
npm run build:ios:preview
```

Optional scripts to keep:
- `test:web`
- `test:web:clear`
- `build:ios:preview`
- `build:ios:production`

---

## 9) Notes for Reuse from Garden AI

Directly reusable:
- Auth context pattern
- Service + schema + model layering
- Reminder lifecycle logic
- Home reminder action pattern (`Done`, `Snooze +1d`)
- Calendar month + day timeline architecture
- Documentation rhythm (`PROGRESS.md`, `RESUME-HERE.md`, `BUILDS.md`)

This gives you fast delivery with proven structure while adapting domain logic to car maintenance.
