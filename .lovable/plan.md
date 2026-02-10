
# Plan: Fix Appealed Records -- Database Correction + Code Verification

## Discrepancy Scan Results

I scanned all attendance records with "Appealed" status. Here are the employees with incorrect statuses that need to be fixed in the database:

### Employees with Discrepancies

| # | Employee | Date | Check In | Check Out | Current Status | Should Be |
|---|----------|------|----------|-----------|----------------|-----------|
| 1 | Arianne Kaye N. Sager | Jan 29 | None | None | Appealed | **Absent** |
| 2 | Aimee June A. Alolor | Jan 30 | 07:17 | None | Appealed | **Undertime** (no punch out) |
| 3 | Mark John J. Ramirez | Jan 30 | 06:55 | 16:00 | Appealed | **Undertime** |
| 4 | Raffa Jade E. Sumindol | Jan 28 | 13:20 | 13:20 | Appealed | **Late and Undertime** |
| 5 | Raffa Jade E. Sumindol | Feb 4 | 07:59 | 12:00 | Appealed | **Undertime** |
| 6 | Zeny M. Puguan | Jan 30 | 07:03 | 05:00 | Appealed | **Undertime** (check_out looks like data error -- 5:00 AM) |
| 7 | Melanie N. Tangonan | Jan 22 | 08:50 | 17:03 | Appealed | **Late** |

The remaining ~40 "Appealed" records are correctly "Present" (on time, full day) and will be updated to "Present" status.

## What Will Be Done

### Step 1: Fix the 7 discrepant records in the database

Update each record to its correct computed status and tag the remarks with "[Appeal Approved]":

- Records 1 (no punches) --> status = "Absent"
- Records 2, 3, 5, 6 (early departure / no punch out) --> status = "Undertime"
- Record 4 (late arrival + early departure) --> status = "Late | Undertime"
- Record 7 (late arrival, full day) --> status = "Late"

### Step 2: Fix all remaining "Appealed" records to "Present"

The ~40 records where employees checked in before 08:00 and out at 17:00 or later will be updated from "Appealed" to "Present" with "[Appeal Approved]" in remarks.

### Step 3: Verify Monthly Matrix View handles edge cases

The MonthlyMatrixView code (lines 250-278) already re-evaluates "Appealed" at display time, but after we fix the DB records, the status column itself will be correct so all views (Dashboard, Reports, Calendar, Time Clock) will automatically show the right values.

## Technical Details

### Database Updates (via edge function or direct update)

7 targeted UPDATE statements for the discrepant records, plus 1 bulk UPDATE for the remaining correct "Present" records. All updates will:
- Set the correct computed status
- Preserve existing `admin_remarks` and prepend "[Appeal Approved]" if not already present

### MonthlyMatrixView -- No code changes needed

The previous fix already handles "Appealed" re-evaluation correctly. Once the DB records are corrected, the "appealed" code path will rarely be hit (only for old cached data).

## Summary

| Item | Detail |
|------|--------|
| Records scanned | ~50 "Appealed" attendance records |
| Discrepancies found | 7 records (listed above) |
| Records correct but mislabeled | ~40 records (should be "Present", not "Appealed") |
| Database updates | Fix all ~50 records to their correct status |
| Code changes | None needed -- previous fixes already handle display |
| Risk | Low -- only correcting status labels to match actual punch data |
