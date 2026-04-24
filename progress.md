# HealQR — Lab Dashboard Build Progress

_Last updated: Apr 24, 2026 (evening)_
_Live: https://teamhealqr.web.app_

## Resume point for tomorrow

**Next page to build:** **Revenue Dashboard** (sidebar item under Lab Dashboard).

Then continue down the sidebar in this order:
1. Revenue Dashboard ⏳ **next**
2. Billing & Receipts
3. Inventory
4. Patient Broadcast
5. Referral Network
6. Patient Retention
7. Queue Display
8. Staff Attendance
9. Social Kit & Offers
10. Allocation Queue
11. Monthly Planner
12. Data Management

---

## Completed today

### 1. Lab Analytics page ✅
- File: `components/LabAnalytics.tsx`
- Wired in `LabDashboard.tsx` under `activeMenu === 'analytics'`
- Timeframe + collection-type filters, KPIs (QR scans, bookings, conversion %, AOV, ops, revenue), daily bar, revenue line, tests-by-category pie, booking-status pie, top 5 tests table.

### 2. FCM fix — Lab Report notifications ✅
**Bug fixed:** reports were being sent as "follow-up reminder" (wrong type, no PDF in payload). Patient's Reports tab never saw them.

- New `sendLabReportReady()` in `services/notificationService.ts`
  - Title `"🧪 Lab Report Ready"`
  - `type: 'lab_report'` with `reportPdfUrl` in FCM data payload + deep link
  - Always stores to patient inbox even on push failure
- Added `'lab_report'` to type unions:
  - `services/patientNotificationStorage.ts` (line ~33)
  - `services/notificationHistoryService.ts` (line ~18)
- `components/LabBookingsManager.tsx` now uses it — tracks `reportFcmSuccess`/`reportFcmError` on the booking doc
- `components/PatientNotifications.tsx` renders 🧪 icon + "Download Lab Report (PDF)" button for `lab_report` type
- **Bonus:** Fixed pre-existing broken import `sendAppointmentCancellation` → `sendAppointmentCancelled` (would have crashed lab's cancel flow at runtime)

### 3. Report Upload page ✅
- File: `components/LabReportUpload.tsx`
- Wired in `LabDashboard.tsx` under `activeMenu === 'report-upload'`
- Three tabs:
  1. **Pending Queue** — `sampleCollected && !reportPdfUrl`, oldest first; one-click PDF upload auto-sends FCM
  2. **Bulk Upload** — drag-drop multi-PDF with auto-matching by filename (booking ID / phone / patient name); manual match picker for unmatched files; one-click "Upload & notify"
  3. **Delivery History** — table with 📱 Delivered / ⚠ Push failed badges, per-row Resend button, View PDF link

### 4. Report Search page ✅
- File: `components/LabReportSearch.tsx`
- Wired in `LabDashboard.tsx` under `activeMenu === 'report-search'`
- Search by patient/phone/bookingId/filename
- Filters: date range, test name, delivery status chips (Uploaded / Delivered / Push Failed / Not Sent / Pending Upload) with live counts
- Per-row: View PDF · Copy link · Send/Resend · Details modal
- Pagination 25/page

---

## Architecture decisions made

- **Report Upload (Bulk+Queue+History) and Report Search are separate pages** — Upload is for ingesting new reports; Search is for finding historical reports for reprint/resend. Both surface FCM delivery status so the lab has proof of delivery.
- **Per-booking report upload in Bookings Manager kept as-is** — right UX for contextual flow; bulk processing lives in Report Upload.
- **All notification reliability info stored on the `labBookings` doc** (`reportFcmSuccess`, `reportFcmError`, `reportSentAt`) so Search / Upload / Bookings all show consistent status.

---

## Open items / known issues

- **Pre-existing TypeScript errors:** ~186 in repo (not caused by today's work). Types for `rx_updated`, `rescheduled`, `chamber_rescheduled`, `appointment_restored` don't line up with union members in `notificationService.ts` / `notificationHistoryService.ts`. Build still succeeds (Vite transpile-only). Not blocking — flag for cleanup sprint.
- **Stale IDE lint** for `'chronic_care'` in `PatientNotifications.tsx` line ~489 — actual source has it in the union, IDE cache issue. Ignore.
- **Bundle size warning:** main `index-*.js` chunk > 1 MB. Worth code-splitting later but not urgent.

---

## Tomorrow's starting commands

```powershell
# Verify nothing broken
cd "c:\Projects\healqr 3"
git pull
npm run build

# Start dev
npm run dev
```

Then open `components/LabDashboard.tsx` and look for the handler for `activeMenu === 'revenue-dashboard'` (or equivalent sidebar key — check `LabSidebar.tsx` for the exact menu ID). Build `components/LabRevenueDashboard.tsx` following the same pattern as `LabAnalytics.tsx`:

- Filters: timeframe + branch (if multi-branch)
- KPIs: Gross revenue, Net revenue (after discounts), Advance collected, Dues outstanding, Refunds
- Charts: revenue trend (daily/weekly/monthly toggle), revenue by test category, revenue by collection type, top revenue-generating tests
- Tables: Top paying patients, Outstanding dues list with Follow-up action, Refund log
