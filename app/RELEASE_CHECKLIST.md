# CarSmart Release Checklist

## Current Target
- App version: `1.1.0`
- Build profile: `production`
- iOS build number: auto-incremented by EAS (`app/eas.json` -> `build.production.autoIncrement: true`)

## Pre-Release Steps
1. Confirm working tree is clean:
   - `git status --short`
2. Confirm app compiles:
   - `cd app`
   - `npx tsc --noEmit`
3. Confirm Profile screen displays expected Software Build values in a dev run.

## Version and Build Number Rules
1. Increment semantic app version for user-visible features.
   - Update `app/app.json` -> `expo.version`.
   - Update `app/package.json` -> `version`.
2. Do not manually edit iOS build number for production.
   - EAS increments it automatically on each production build.
3. Verify increment in build logs.
   - Expected line: `Incremented buildNumber from X to Y`.

## Build Commands
1. Create iOS production build:
   - `cd app`
   - `npx eas-cli build --platform ios --profile production --non-interactive`
2. Submit latest build to TestFlight:
   - `npx eas-cli submit --platform ios --profile production --latest --non-interactive`

## Post-Build Verification
1. Open EAS build URL and confirm status `finished`.
2. Open App Store Connect -> TestFlight and verify new build appears.
3. Validate smoke tests on TestFlight:
   - Sign in
   - Add reminder with `Registration Renewal`
   - Confirm due date save
   - Confirm local notification permission prompt and scheduled alert behavior

## Release Notes Update
1. Add a new version section to `app/RELEASE_NOTES.md`.
2. Include key features, bug fixes, and migration notes.
3. Reference build queue URL and TestFlight status.
