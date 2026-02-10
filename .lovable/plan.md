

# Add Absent Records for All Employees (Jan 5–19, 2025)

## What Will Be Done

Insert "Absent" attendance records for all 30 active employees on every **working day** (Mon–Fri) from January 5 to January 19, 2025.

### Working Days Covered
Jan 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19

### Exceptions (will NOT get Absent)
- **Gelene A. Viray** on **Jan 5** (LOP leave)
- **Sheila Mae P. Dadula** on **Jan 14, 15, 16** (VL leave)

### What Gets Inserted
For each employee+date combination (excluding the exceptions above), an attendance record with:
- `status`: "Absent"
- `check_in`: NULL
- `check_out`: NULL

### Data Summary
- 30 employees x 11 working days = 330 records
- Minus 1 (Gelene Jan 5) and 3 (Sheila Jan 14-16) = **326 Absent records** to insert
- Plus 1 LOP leave record for Gelene (Jan 5)
- Plus 1 VL leave record for Sheila (Jan 14-16, 3 days)

### Technical Details

A single database migration will use a SQL `INSERT` statement with all 326 employee-date pairs, each with `status = 'Absent'` and null punch times. The leave records for Gelene (LOP) and Sheila (VL) will be inserted as approved leave records so the system correctly shows them as LOP/VL in the matrix.

