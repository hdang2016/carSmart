# CarSmart - Release Notes

## Version 1.0.0 (Build Date: March 13, 2026)

### Features

#### Vehicle Management
- Manage multiple vehicles in "My Garage"
- **Enhanced**: Tap anywhere on a vehicle card to view details (not just the "View" button)
- Track current mileage with automatic date recording
- Add, edit, and archive vehicles
- Display make, model, year, and current mileage

#### Maintenance Tracking
- Log maintenance records with date, mileage, cost, and notes
- Track different service types (Oil Change, Tire Rotation, Brake Service, etc.)
- View maintenance history organized by vehicle
- Edit and manage existing maintenance records

#### Service Reminders
- Automatic reminder generation when logging maintenance
- Manual "Generate Reminders" option in Maintenance Settings
- Combined date AND mileage criteria (whichever comes first)
- **New**: Custom snooze duration - prompt users to specify number of days
- **New**: Remove/Delete button for cleaning up duplicate reminders
- Visual indicators for overdue reminders (red borders, "Overdue" badges)
- Three reminder categories: Overdue, Due Soon (within 7 days or 500 miles), Upcoming

#### Calendar View
- Monthly calendar overview with maintenance and reminder counts
- Filter by All, Maintenance, or Reminders
- Daily timeline view with date chips
- Separate section for mileage-only reminders (no due date)
- **New**: Done, Snooze (custom days), and Remove buttons for all reminders

#### Home Dashboard
- Quick overview with stats: Active Vehicles, Overdue reminders, Due Soon
- Expandable reminder cards with actions
- Smart sorting: overdue first, then by date/mileage
- Empty state with "Generate Reminders" button when applicable

#### Maintenance Settings
- Configure default service intervals per maintenance type
- Set both mileage intervals (e.g., 5,000 miles) and time intervals (e.g., 6 months)
- **New**: Accessible "Generate Reminders" button
- Reset to factory defaults option

#### Authentication & Profile
- Firebase Authentication integration
- Secure sign-in and sign-up
- User profile management

#### Theme Support
- Light and dark mode support
- Consistent color theming across all screens
- Theme toggle in Profile screen

### Technical Improvements
- TypeScript for type safety
- React Query for efficient data fetching and caching
- Firebase Firestore for real-time data sync
- React Navigation for smooth screen transitions
- Proper error handling and loading states
- Form validation with Zod schemas

### Bug Fixes
- Fixed duplicate reminder creation issue (identified root cause in createAutoReminder)
- Improved reminder status calculation (overdue vs due soon)
- Enhanced mileage display with "miles remaining" indicator

### Known Issues
- Push notifications not yet implemented (expo-notifications installed but not configured)
- Duplicate checking not yet added to auto-reminder creation (users can manually remove duplicates)

### Coming Soon
- Push notifications for due and overdue reminders
- Export maintenance history
- Photo attachments for service records
- Fuel tracking
- Cost analytics and trends

---

## Build Information
- **Platform**: iOS (Preview Build)
- **Build Type**: Internal Distribution
- **EAS Project ID**: 5d487116-d3bb-42b0-86c8-e60f04a87ff4
- **Bundle Identifier**: com.carsmart.app7b554

## Installation
This is a preview build distributed internally via TestFlight or direct download. Follow the installation link provided by EAS Build.
